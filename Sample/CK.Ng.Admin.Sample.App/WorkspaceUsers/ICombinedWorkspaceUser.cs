using CK.Core;

namespace CK.Ng.Admin.Sample.App.WorkspaceUsers;

/// <summary>
/// App-level leaf of the workspace-user Poco family. It multiply-inherits the UserBanned
/// (<c>Bans</c>) and UserInvitation (<c>Email</c>) extensions so that, when both feature packages
/// are composed, a single materialization can carry both. The Poco engine merges the whole
/// family into the one concrete <see cref="CK.IO.UserManagement.IWorkspaceUser"/> implementation.
/// </summary>
public interface ICombinedWorkspaceUser : CK.IO.UserManagement.UserBanned.IWorkspaceUser,
                                          CK.IO.UserManagement.UserInvitation.IWorkspaceUser
{
}
