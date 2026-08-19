import { CrisEndpoint, RegisterSessionCommand } from '@local/ck-gen';

/**
 * A message pushed by the server. Only `type` is guaranteed: senders are free to add their own
 * fields, which is why the index signature is kept open.
 */
export interface SessionChannelMessage {
  readonly type: string;
  readonly [key: string]: unknown;
}

export type SessionMessageHandler = ( message: SessionChannelMessage ) => void;
export type SessionErrorHandler = ( error: unknown ) => void;

// Reconnection backoff: doubles on each failed attempt, capped. A ban is a rare event, there is no
// point hammering a server that is down.
const RECONNECT_MIN_MS = 1000;
const RECONNECT_MAX_MS = 30000;

/**
 * Client of the server-to-client session channel.
 *
 * The socket itself carries no credential: it is opened anonymously, the server answers with a
 * connection identifier, and the identity is bound afterwards by sending that identifier through the
 * authenticated Cris endpoint. No token ever transits in the socket URL.
 *
 * That negotiation is replayed in full on every reconnection, which is what makes the channel
 * self-healing: whatever the server refuses at registration time (a banished user, typically) is
 * refused again the moment the client comes back, without any polling in between.
 */
export class SessionChannel {
  readonly #handlers = new Map<string, Array<SessionMessageHandler>>();
  readonly #registerErrorHandlers: Array<SessionErrorHandler> = [];

  #socket?: WebSocket;
  #connectionId?: string;
  // True between stopAsync() and the next start(): tells the close handler not to reconnect.
  #stopped = true;
  #reconnectDelay = RECONNECT_MIN_MS;
  #reconnectTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly url: string,
    private readonly crisEndpoint: CrisEndpoint
  ) { }

  /** Registers a handler for one message type. Several handlers per type are allowed. */
  onMessage( type: string, handler: SessionMessageHandler ): void {
    const existing = this.#handlers.get( type );
    if ( existing ) existing.push( handler );
    else this.#handlers.set( type, [handler] );
  }

  /**
   * Registers a handler called when the registration command is rejected. This is not merely an
   * error path: a rejection is how the server tells this client that it is no longer welcome.
   */
  onRegisterError( handler: SessionErrorHandler ): void {
    this.#registerErrorHandlers.push( handler );
  }

  /** Opens the channel. Idempotent: calling it on an open channel does nothing. */
  start(): void {
    if ( !this.#stopped ) return;
    this.#stopped = false;
    this.#reconnectDelay = RECONNECT_MIN_MS;
    this.#connect();
  }

  /** Closes the channel and cancels any pending reconnection. */
  async stopAsync(): Promise<void> {
    this.#stopped = true;
    if ( this.#reconnectTimer !== undefined ) {
      clearTimeout( this.#reconnectTimer );
      this.#reconnectTimer = undefined;
    }
    const socket = this.#socket;
    this.#socket = this.#connectionId = undefined;
    if ( !socket ) return;
    await new Promise<void>( resolve => {
      // Resolve on close rather than immediately: callers stop the channel to release it, and a
      // half-closed socket would still deliver messages.
      socket.addEventListener( 'close', () => resolve(), { once: true } );
      try {
        socket.close();
      } catch ( e ) {
        console.error( e );
        resolve();
      }
    } );
  }

  #connect(): void {
    this.#connectionId = undefined;
    let socket: WebSocket;
    try {
      socket = new WebSocket( this.url );
    } catch ( e ) {
      // A malformed URL or a blocked scheme: retrying cannot hurt, and stopping silently would leave
      // the channel dead with no trace.
      console.error( e );
      this.#scheduleReconnect();
      return;
    }
    this.#socket = socket;
    socket.onmessage = event => this.#onMessageEvent( socket, event );
    // onerror is always followed by onclose: reconnection is handled there only, so a single failure
    // cannot schedule two attempts.
    socket.onerror = () => console.warn( 'Session channel: socket error.' );
    socket.onclose = () => this.#onCloseEvent( socket );
  }

  #onMessageEvent( socket: WebSocket, event: MessageEvent ): void {
    // A late message from a socket already replaced by a reconnection must be ignored.
    if ( socket !== this.#socket ) return;
    let data: { connectionId?: string } & Partial<SessionChannelMessage>;
    try {
      data = JSON.parse( event.data );
    } catch ( e ) {
      console.error( 'Session channel: unparseable message.', e );
      return;
    }
    // The first message of a connection is the negotiation, and it is the only one carrying a
    // connectionId. Everything after it is a typed message.
    if ( this.#connectionId === undefined && typeof data.connectionId === 'string' ) {
      this.#connectionId = data.connectionId;
      void this.#registerAsync( socket, data.connectionId );
      return;
    }
    if ( typeof data.type !== 'string' ) {
      console.warn( 'Session channel: message without a type, ignored.' );
      return;
    }
    const handlers = this.#handlers.get( data.type );
    if ( !handlers ) return;
    for ( const handler of handlers ) {
      try {
        handler( data as SessionChannelMessage );
      } catch ( e ) {
        // One faulty handler must not prevent the others from seeing the message.
        console.error( e );
      }
    }
  }

  async #registerAsync( socket: WebSocket, connectionId: string ): Promise<void> {
    const command = new RegisterSessionCommand();
    command.connectionId = connectionId;
    try {
      await this.crisEndpoint.sendOrThrowAsync( command );
      // Only a completed negotiation proves the server is healthy: resetting the backoff earlier
      // would let a server that accepts sockets but refuses commands be hammered.
      this.#reconnectDelay = RECONNECT_MIN_MS;
    } catch ( e ) {
      if ( socket !== this.#socket ) return; // Obsolete socket, the answer no longer matters.
      for ( const handler of this.#registerErrorHandlers ) {
        try {
          handler( e );
        } catch ( inner ) {
          console.error( inner );
        }
      }
    }
  }

  #onCloseEvent( socket: WebSocket ): void {
    if ( socket !== this.#socket ) return; // Close of a socket already replaced: nothing to do.
    this.#socket = this.#connectionId = undefined;
    if ( this.#stopped ) return;
    this.#scheduleReconnect();
  }

  #scheduleReconnect(): void {
    if ( this.#stopped || this.#reconnectTimer !== undefined ) return;
    const delay = this.#reconnectDelay;
    this.#reconnectDelay = Math.min( delay * 2, RECONNECT_MAX_MS );
    this.#reconnectTimer = setTimeout( () => {
      this.#reconnectTimer = undefined;
      if ( !this.#stopped ) this.#connect();
    }, delay );
  }
}
