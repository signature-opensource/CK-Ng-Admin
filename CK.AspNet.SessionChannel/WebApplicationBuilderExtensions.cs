using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using SimpleR;
using System;

namespace CK.AspNet.SessionChannel;

/// <summary>
/// Extension methods for registering and mapping the session channel.
/// </summary>
public static class WebApplicationBuilderExtensions
{
    /// <summary>
    /// The WebSocket endpoint of the session channel. The client must use the very same path.
    /// </summary>
    public const string SessionChannelPath = "/ws/session";

    /// <summary>
    /// Registers the SimpleR services required by the session channel.
    /// </summary>
    /// <param name="builder">The web application builder.</param>
    /// <returns>The <paramref name="builder"/> for chaining.</returns>
    public static WebApplicationBuilder AddSessionChannel( this WebApplicationBuilder builder )
    {
        builder.Services.AddSimpleR();
        return builder;
    }

    /// <summary>
    /// Maps the <see cref="SessionChannelPath"/> WebSocket endpoint using the
    /// <see cref="SessionChannelDispatcher"/>.
    /// </summary>
    /// <param name="app">The application builder.</param>
    /// <returns>The <paramref name="app"/> for chaining.</returns>
    public static IApplicationBuilder UseSessionChannel( this IApplicationBuilder app )
    {
        app.UseEndpoints( endpoints =>
        {
            endpoints.MapSimpleR<string, ReadOnlyMemory<byte>>( SessionChannelPath, b =>
            {
                b.UseEndOfMessageDelimitedProtocol( new RawMessageProtocol() );
                b.UseDispatcher<SessionChannelDispatcher>();
            },
            // Aborting (on ApplicationStopping) still triggers a graceful close that waits CloseTimeout
            // (5s) for the client handshake; zero tears the socket down at once so shutdown never
            // depends on client behaviour.
            options => options.WebSockets.CloseTimeout = TimeSpan.Zero );
        } );

        return app;
    }
}
