using SimpleR;
using System;
using System.Buffers;
using System.Text.Json;
using System.Threading.Tasks;

namespace CK.AspNet.SessionChannel;

/// <summary>
/// SimpleR dispatcher that manages the <see cref="SessionConnection"/> lifecycle for each WebSocket
/// connection on the session channel endpoint.
/// <para>
/// On connect, registers the connection and sends back a JSON message containing its identifier. The
/// connection stays anonymous until the client echoes that identifier through the authenticated
/// <see cref="IRegisterSessionCommand"/>.
/// </para>
/// </summary>
public sealed class SessionChannelDispatcher : IWebSocketMessageDispatcher<string, ReadOnlyMemory<byte>>
{
    readonly SessionChannelRegistry _registry;

    public SessionChannelDispatcher( SessionChannelRegistry registry )
    {
        _registry = registry;
    }

    /// <summary>
    /// Registers the connection and sends back a JSON message containing its identifier.
    /// </summary>
    /// <param name="connection">The newly established connection.</param>
    public async Task OnConnectedAsync( IWebsocketConnectionContext<ReadOnlyMemory<byte>> connection )
    {
        // CreateAsync returns false (and has already aborted the connection) when the host is stopping
        // or the connection id collides. Don't write the acknowledgement onto an aborted connection:
        // return and let the cancelled read loop end the connection.
        if( await _registry.CreateAsync( connection ).ConfigureAwait( false ) is false )
        {
            return;
        }
        var buffer = new ArrayBufferWriter<byte>( 64 );
        await using var writer = new Utf8JsonWriter( buffer );
        writer.WriteStartObject();
        writer.WriteString( "connectionId", connection.ConnectionId );
        writer.WriteEndObject();
        await writer.FlushAsync();
        await connection.WriteAsync( buffer.WrittenMemory );
    }

    /// <summary>
    /// Unregisters the connection and releases it.
    /// </summary>
    /// <param name="connection">The connection that is being disconnected.</param>
    /// <param name="exception">The exception that caused the disconnection, if any.</param>
    public async Task OnDisconnectedAsync( IWebsocketConnectionContext<ReadOnlyMemory<byte>> connection, Exception? exception )
    {
        await _registry.DestroyAsync( connection.ConnectionId ).ConfigureAwait( false );
    }

    /// <summary>
    /// Does nothing: this channel is descending only. Everything the client has to say travels on the
    /// authenticated Cris endpoint instead.
    /// </summary>
    /// <param name="connection">The connection the message came from.</param>
    /// <param name="message">The received message.</param>
    public Task DispatchMessageAsync( IWebsocketConnectionContext<ReadOnlyMemory<byte>> connection, string message )
    {
        return Task.CompletedTask;
    }
}
