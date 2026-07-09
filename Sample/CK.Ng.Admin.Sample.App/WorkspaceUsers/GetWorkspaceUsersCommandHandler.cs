using CK.Core;
using CK.Cris;
using CK.IO.UserManagement;
using CK.SqlServer;

namespace CK.Ng.Admin.Sample.App.WorkspaceUsers;

/// <summary>
/// App-level handler for <see cref="IGetWorkspaceUsersQCommand"/>. Both the BinnedUser
/// (<c>BinDate</c>-aware) and UserInvitation (e-mail-aware) packages ship their own closed handler for
/// this command; composed together they would be ambiguous. Declaring
/// <see cref="ICommandHandler{IGetWorkspaceUsersQCommand}"/> here makes the Cris engine elect this
/// service over the package handlers, and it returns the combined projection (core columns + BinDate +
/// e-mail).
/// <para>
/// Same election mechanism as <c>CK.Ng.Admin.Sample.App.User.GetUserProfileCommandHandler</c>.
/// </para>
/// </summary>
[ReplaceAutoService( typeof( CK.UserManagement.BinnedUser.BinnedWorkspaceUsersHandler ) )]
[ReplaceAutoService( typeof( CK.UserManagement.UserInvitation.UserInvitationWorkspaceUsersHandler ) )]
public class GetWorkspaceUsersCommandHandler : IAutoService, ICommandHandler<IGetWorkspaceUsersQCommand>
{
    readonly WorkspaceUsersQueries _queries;

    public GetWorkspaceUsersCommandHandler( WorkspaceUsersQueries queries )
    {
        _queries = queries;
    }

    [CommandHandler]
    public async Task<List<IWorkspaceUser>> GetWorkspaceUsersAsync( ISqlCallContext ctx, IGetWorkspaceUsersQCommand query )
    {
        var workspaceId = query.CurrentWorkspaceId.GetValueOrDefault();
        using( ctx.Monitor.OpenInfo( $"Handling {nameof( IGetWorkspaceUsersQCommand )} query (combined BinDate + e-mail). (WorkspaceId: {workspaceId})" ) )
        {
            try
            {
                var users = await _queries.GetWorkspaceUsersAsync( ctx, workspaceId );
                return users.ToList();
            }
            catch( Exception e )
            {
                ctx.Monitor.Error( e );
                return new();
            }
        }
    }
}
