using System;
using System.Threading;
using System.Threading.Tasks;
using SimpleR;

namespace CK.AspNet.SessionChannel;

/// <summary>
/// One open WebSocket connection of the session channel.
/// <para>
/// A connection is anonymous when it is created: <see cref="ActorId"/> stays 0 until the client sends
/// the <see cref="IRegisterSessionCommand"/> on the authenticated Cris channel. This is what avoids
/// carrying any token in the socket URL.
/// </para>
/// <para>
/// Writes are serialized: several pushes can target the same connection concurrently.
/// </para>
/// </summary>
public class SessionConnection : IAsyncDisposable
{
    readonly IWebsocketConnectionContext<ReadOnlyMemory<byte>> _connection;
    readonly SemaphoreSlim _writeLock;
    // Guards against in-flight pushes writing to a disposed connection, and prevents double-dispose
    // of the semaphore if disposal paths ever overlap.
    volatile bool _disposed;

    /// <summary>
    /// Initializes a new <see cref="SessionConnection"/> on a freshly established WebSocket connection.
    /// </summary>
    /// <param name="connection">The SimpleR connection to push messages to.</param>
    public SessionConnection( IWebsocketConnectionContext<ReadOnlyMemory<byte>> connection )
    {
        _connection = connection;
        _writeLock = new SemaphoreSlim( 1, 1 );
    }

    /// <summary>
    /// Gets the connection identifier, sent to the client on connect and echoed back by the
    /// <see cref="IRegisterSessionCommand"/>.
    /// </summary>
    public string ConnectionId => _connection.ConnectionId;

    /// <summary>
    /// Gets the user this connection has been bound to, 0 while it is still anonymous.
    /// Set by <see cref="SessionChannelRegistry"/> when the registration command succeeds.
    /// </summary>
    public int ActorId { get; internal set; }

    /// <summary>
    /// Writes a message to the client. Silently does nothing once the connection has been disposed:
    /// a push racing with a disconnection is normal, not an error.
    /// </summary>
    /// <param name="message">The raw bytes to write.</param>
    public async ValueTask WriteAsync( ReadOnlyMemory<byte> message )
    {
        if( _disposed ) return; // In-flight push after dispose: silently bail out.
        await _writeLock.WaitAsync().ConfigureAwait( false );
        try
        {
            if( _disposed ) return; // Dispose happened while waiting for the lock.
            await _connection.WriteAsync( message ).ConfigureAwait( false );
        }
        finally
        {
            _writeLock.Release();
        }
    }

    /// <summary>
    /// Aborts the connection (idempotent): cancels the pending SimpleR read and drives the normal
    /// disconnect path, so on host shutdown Kestrel drains immediately instead of waiting out
    /// <c>HostOptions.ShutdownTimeout</c>.
    /// </summary>
    public void Abort() => _connection.Abort();

    /// <inheritdoc />
    public async ValueTask DisposeAsync()
    {
        if( _disposed ) return; // Already disposed.
        _disposed = true;
        await DisposeCoreAsync().ConfigureAwait( false );
        _writeLock.Dispose();
    }

    /// <summary>
    /// Released by <see cref="DisposeAsync"/> before the write lock is disposed. Does nothing here:
    /// this hook exists so a specialization can release what it subscribed to.
    /// </summary>
    protected virtual ValueTask DisposeCoreAsync() => ValueTask.CompletedTask;
}
