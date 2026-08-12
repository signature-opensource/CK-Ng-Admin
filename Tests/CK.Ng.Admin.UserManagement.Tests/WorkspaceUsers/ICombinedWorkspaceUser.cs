using CK.Core;

namespace CK.Ng.Admin.UserManagement.Tests.WorkspaceUsers;

/// <summary>
/// Test-composition leaf of the workspace-user Poco family (BinDate + Email). Mirrors
/// <c>CK.Ng.Admin.Sample.App.WorkspaceUsers.ICombinedWorkspaceUser</c>.
/// </summary>
public interface ICombinedWorkspaceUser : CK.IO.UserManagement.UserBanned.IWorkspaceUser,
                                          CK.IO.UserManagement.UserInvitation.IWorkspaceUser
{
}
