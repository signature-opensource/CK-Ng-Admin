using CK.Core;
using CK.Cris;

namespace CK.IO.Workspace;

/// <summary>
/// Marker interface for commands that operate within a workspace scope.
/// The workspace context is resolved server-side (e.g. from a workspace
/// cache) rather than carried on the command payload.
/// Under the single-workspace assumption there is no per-command
/// <c>WorkspaceId</c> property; this may change when multi-workspace
/// support lands.
/// </summary>
[CKTypeDefiner]
public interface ICommandWorkspace : ICommandPart
{
}
