using CK.Core;
using CK.TypeScript;

namespace CK.AspNet.SessionChannel;

/// <summary>
/// TypeScript package that exposes the <c>SessionChannel</c> client to generated TypeScript clients.
/// <para>
/// The client is deliberately feature agnostic: it opens the socket, negotiates its identity through
/// the <see cref="IRegisterSessionCommand"/> and dispatches incoming messages by their <c>type</c>.
/// What a given type means is the business of whoever registers a handler.
/// </para>
/// </summary>
[TypeScriptPackage]
[TypeScriptFile( "session-channel.ts", "SessionChannel" )]
public class SessionChannelPackage : TypeScriptPackage
{
}
