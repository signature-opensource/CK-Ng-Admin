namespace CK.Ng.Admin.Sample.App.User;

/// <summary>
/// App-level leaf of the user-profile Poco family. It multiply-inherits the feature-package
/// extensions so that a single materialization carries them all: the preferred culture, the
/// preferred workspace + groups, and the temporary-password state.
/// <para>
/// Same pattern as <see cref="WorkspaceUsers.ICombinedWorkspaceUser"/>: the Poco engine merges the
/// whole family into the one concrete <c>CK.IO.Actor.IUserProfile</c> implementation.
/// </para>
/// </summary>
public interface IUserProfile : CK.IO.User.PreferredCulture.IUserProfile,
                               CK.IO.UserProfile.Workspace.IUserProfile,
                               CK.IO.User.UserPassword.Reset.IUserProfile
{
}
