import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { BannedSession, UserService } from '@local/ck-gen';

/**
 * Forbids every private page to a banished user and logs it out.
 *
 * This is the slowest of the three detections and the one that survives everything else: it needs no
 * socket, no push and no server round trip. Its case is the hard load - a reload or a typed URL -
 * where the profile is read again on the way in and comes back with the banishment already set.
 *
 * Registered by AppRoutes.t as a `canActivate` of the private page, which also carries
 * `runGuardsAndResolvers: 'always'` so that it runs on every navigation of the subtree, including a
 * landing on the private page itself and a navigation back to it from inside.
 */
export const bannedGuard: CanActivateFn = async () => {
  // The injections (and the toObservable below) must happen before the first await: the injection
  // context is lost afterwards.
  const userService = inject( UserService );
  const bannedSession = inject( BannedSession );

  // On a hard load the profile is still in flight: wait for it rather than letting the navigation
  // through. profileLoaded settles even when the read failed, in which case the profile stays
  // undefined and the navigation is allowed: a network incident must not lock the user out.
  if ( !userService.profileLoaded() ) {
    await firstValueFrom( toObservable( userService.profileLoaded ).pipe( filter( loaded => loaded ) ) );
  }

  if ( !userService.userProfile()?.isBanned ) return true;

  // No redirection returned: logoutBannedAsync navigates to the authentication page itself, and
  // returning its URL here would race with that navigation.
  await bannedSession.logoutBannedAsync();
  return false;
};
