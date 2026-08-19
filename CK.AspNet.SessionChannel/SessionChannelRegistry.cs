using CK.Core;
using CK.Cris;
using Microsoft.Extensions.Hosting;
using SimpleR;
using System;
using System.Buffers;
using System.Collections.Concurrent;
using System.Text.Json;
using System.Threading.Tasks;

namespace CK.AspNet.SessionChannel;

/// <summary>
/// Singleton that tracks every open <see cref="SessionConnection"/>, keyed by connection identifier,
/// and indexes them by the user they have been bound to so that a message can reach all the
/// connections of one user at once (several tabs, several devices).
/// <para>
/// Handles <see cref="IRegisterSessionCommand"/>: this is where an anonymous socket becomes the socket
/// of an identified user.
/// </para>
/// </summary>
public sealed class SessionChannelRegistry : IRealObject, ISessionChannelPush
{
    readonly ConcurrentDictionary<string, SessionConnection> _connections = new();
    // Reverse index used by PushAsync: the connection identifiers of one user. The inner dictionary is
    // a set (its byte value is never read); a user legitimately has several connections at once.
    readonly ConcurrentDictionary<int, ConcurrentDictionary<string, byte>> _byActor = new();

    // Set by AbortAll on ApplicationStopping: once stopping, new connections are refused so an
    // auto-reconnecting client cannot re-arm the full ShutdownTimeout drain.
    volatile bool _stopping;

    /// <summary>
    /// Registers <see cref="AbortAll"/> on <see cref="IHostApplicationLifetime.ApplicationStopping"/> so
    /// open connections are aborted before Kestrel starts draining (OnHostStopAsync is only a late
    /// backstop).
    /// </summary>
    void OnHostStart( IActivityMonitor monitor, IHostApplicationLifetime lifetime )
    {
        // This real object is a process singleton: reset _stopping so the registry is reusable if a new
        // host starts on the same StObjMap (e.g. across tests) after a previous host stopped.
        _stopping = false;
        lifetime.ApplicationStopping.Register( AbortAll );
    }

    /// <summary>
    /// Handles <see cref="IRegisterSessionCommand"/>: binds the connection to the calling user.
    /// <para>
    /// Reaching this method already means the caller passed every command-handling validator: a user
    /// that some validator refuses (a banished one) never gets its connection bound.
    /// </para>
    /// </summary>
    /// <param name="monitor">The monitor to use.</param>
    /// <param name="command">The registration command.</param>
    [CommandHandler]
    public void HandleRegisterSession( IActivityMonitor monitor, IRegisterSessionCommand command )
    {
        int actorId = command.ActorId.GetValueOrDefault();
        if( !_connections.TryGetValue( command.ConnectionId, out var connection ) )
        {
            // Also covers the legitimate case of a socket closed between the negotiation and this
            // command: the client renegotiates a new identifier anyway.
            Throw.InvalidDataException( $"Connection {command.ConnectionId} does not exist, or is not identified as you." );
            return;
        }
        // Re-registering the same connection is harmless: the client renegotiates on every reconnection
        // and a retry must not create a second index entry.
        if( connection.ActorId != 0 && connection.ActorId != actorId )
        {
            Throw.InvalidDataException( $"Connection {command.ConnectionId} is already bound to another user." );
            return;
        }
        connection.ActorId = actorId;
        _byActor.GetOrAdd( actorId, _ => new ConcurrentDictionary<string, byte>() )
                .TryAdd( connection.ConnectionId, 0 );
        monitor.Trace( $"Session channel: connection {connection.ConnectionId} bound to user {actorId}." );
    }

    /// <inheritdoc />
    public async Task PushAsync( int userId, string type )
    {
        Throw.CheckNotNullOrWhiteSpaceArgument( type );
        if( !_byActor.TryGetValue( userId, out var connectionIds ) ) return;
        var message = CreateTypedMessage( type );
        foreach( var connectionId in connectionIds.Keys )
        {
            if( _connections.TryGetValue( connectionId, out var connection ) )
            {
                await connection.WriteAsync( message ).ConfigureAwait( false );
            }
        }
    }

    static ReadOnlyMemory<byte> CreateTypedMessage( string type )
    {
        var buffer = new ArrayBufferWriter<byte>( 64 );
        using( var writer = new Utf8JsonWriter( buffer ) )
        {
            writer.WriteStartObject();
            writer.WriteString( "type", type );
            writer.WriteEndObject();
            writer.Flush();
        }
        return buffer.WrittenMemory;
    }

    internal async Task<bool> CreateAsync( IWebsocketConnectionContext<ReadOnlyMemory<byte>> connection )
    {
        // Refuse new connections once stopping so a reconnect cannot re-arm the ShutdownTimeout drain.
        if( _stopping )
        {
            connection.Abort();
            return false;
        }

        var session = new SessionConnection( connection );
        if( _connections.TryAdd( connection.ConnectionId, session ) is false )
        {
            await session.DisposeAsync().ConfigureAwait( false );
            return false;
        }

        // Re-check: AbortAll sets _stopping before iterating, so it may have missed this entry added
        // just after.
        if( _stopping && _connections.TryRemove( connection.ConnectionId, out _ ) )
        {
            connection.Abort();
            await session.DisposeAsync().ConfigureAwait( false );
            return false;
        }

        return true;
    }

    /// <summary>
    /// Sets the stopping flag then aborts every tracked connection (registered on ApplicationStopping
    /// by <see cref="OnHostStart"/>). Each connection is then removed by <see cref="DestroyAsync"/> as
    /// its read loop ends.
    /// </summary>
    internal void AbortAll()
    {
        _stopping = true;
        foreach( var kv in _connections )
        {
            kv.Value.Abort();
        }
    }

    internal async Task<bool> DestroyAsync( string connectionId )
    {
        if( _connections.TryRemove( connectionId, out var connection ) )
        {
            Unindex( connection );
            await connection.DisposeAsync().ConfigureAwait( false );
            return true;
        }

        return false;
    }

    // Removes the connection from the per-user index, and the user entry itself once its last
    // connection is gone: without this the dictionary would keep one empty set per user ever seen.
    void Unindex( SessionConnection connection )
    {
        int actorId = connection.ActorId;
        if( actorId == 0 ) return; // Never registered: it is not in the index.
        if( _byActor.TryGetValue( actorId, out var connectionIds ) )
        {
            connectionIds.TryRemove( connection.ConnectionId, out _ );
            if( connectionIds.IsEmpty ) _byActor.TryRemove( actorId, out _ );
        }
    }

    async Task OnHostStopAsync( IActivityMonitor monitor )
    {
        // Late backstop: AbortAll should already have closed everything. Abort (not just dispose) any
        // straggler, since DisposeAsync alone never aborts the socket.
        _stopping = true;
        foreach( var kv in _connections )
        {
            if( _connections.TryRemove( kv.Key, out var connection ) )
            {
                Unindex( connection );
                connection.Abort();
                await connection.DisposeAsync().ConfigureAwait( false );
            }
        }
    }
}
