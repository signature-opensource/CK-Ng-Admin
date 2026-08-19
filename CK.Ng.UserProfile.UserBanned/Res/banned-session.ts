import { effect, inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import {
  AuthLevel,
  HttpCrisEndpoint,
  NgAuthService,
  NotificationService,
  SessionChannel,
  UserService
} from '@local/ck-gen';

/**
 * Message type pushed by the server when a banishment hits this user. Must stay in sync with
 * `UserBannedPushService.BannedMessageType`.
 */
const BANNED_MESSAGE_TYPE = 'banned';

/**
 * WebSocket endpoint of the session channel. Must stay in sync with
 * `WebApplicationBuilderExtensions.SessionChannelPath`.
 */
const SESSION_CHANNEL_URL = '/ws/session';

/**
 * Owns the session channel and the single logout path of the banishment flow.
 *
 * Three detections lead to the same exit, and they can fire together, hence the guard flag:
 *  - the server pushes `banned` on the channel: this is the nominal, instant case;
 *  - the channel registration is rejected: the server refuses a command of this user, which is what
 *    happens the moment a client that was unreachable comes back. The rejection alone does not say
 *    why, so the profile is asked (see below);
 *  - the navigation guard reads `isBanned` on an already loaded profile.
 *
 * None of this is the security mechanism: a banished user is stopped by the server refusing its
 * commands. What lives here only makes the ejection immediate and legible.
 */
@Injectable( { providedIn: 'root' } )
export class BannedSession {
  readonly #authService = inject( NgAuthService );
  readonly #crisEndpoint = inject( HttpCrisEndpoint );
  readonly #notifService = inject( NotificationService );
  readonly #router = inject( Router );
  readonly #translateService = inject( TranslateService );
  readonly #userService = inject( UserService );

  readonly #channel: SessionChannel;
  // Held while a logout is in flight: the three detections are concurrent by design and only the
  // first one may act.
  #loggingOut = false;

  constructor() {
    this.#channel = new SessionChannel( SESSION_CHANNEL_URL, this.#crisEndpoint );
    this.#channel.onMessage( BANNED_MESSAGE_TYPE, () => void this.logoutBannedAsync() );
    this.#channel.onRegisterError( () => void this.#onRegisterRejectedAsync() );

    // No socket for an anonymous visitor, and one that closes on logout. Reading the signal here is
    // what re-opens the channel after a login.
    effect( () => {
      if ( this.#authService.authenticationInfo().level >= AuthLevel.Normal ) this.#channel.start();
      else void this.#channel.stopAsync();
    } );
  }

  /**
   * Logs the user out and sends it back to the authentication page. Idempotent: whichever detection
   * gets there first wins, the others become no-ops.
   *
   * The flag is released at the end rather than kept forever: this service is a root singleton, so it
   * outlives the session, and another user may well log in in the same page afterwards. Testing the
   * authentication level is what makes a late detection harmless in the meantime - without it, a
   * message arriving just after the logout would notify a user that is already gone.
   */
  async logoutBannedAsync(): Promise<void> {
    if ( this.#loggingOut ) return;
    if ( this.#authService.authenticationInfo().level < AuthLevel.Normal ) return;
    this.#loggingOut = true;
    try {
      // Stop first: the socket must not resurrect itself while the logout is in flight.
      await this.#channel.stopAsync();
      this.#notifService.notifySimpleMessage( 'error', this.#translateService.instant( 'CK.Auth.Banned.Message' ) );
      await this.#authService.authService.logout();
      await this.#router.navigateByUrl( '/auth' );
    } finally {
      this.#loggingOut = false;
    }
  }

  /**
   * A rejected registration only tells us that the server refused a command of this user; it never
   * says why, because the resource key of a user message is not transmitted to the client (a
   * SimpleUserMessage carries its level, its translated text and its depth, nothing else).
   *
   * So the profile is asked. That read is deliberately exempted from the banishment validator on the
   * server precisely so it can still answer for a banished user, which makes it the one reliable way
   * for a client to learn its own standing.
   */
  async #onRegisterRejectedAsync(): Promise<void> {
    if ( this.#loggingOut ) return;
    await this.#userService.refreshUserProfileAsync();
    if ( this.#userService.userProfile()?.isBanned ) await this.logoutBannedAsync();
  }
}
