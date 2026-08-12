using CK.Core;
using CK.Cris;
using CK.IO.UserManagement;
using CK.SqlServer;

namespace CK.Ng.Admin.UserManagement.Tests.WorkspaceUsers;

/// <summary>
/// Test-composition handler for <see cref="IGetWorkspaceUsersQCommand"/> combining the BinnedUser
/// (BinDate) and UserInvitation (e-mail) listings. Supersedes the two package list handlers via
/// <c>[ReplaceAutoService]</c>. Mirrors
/// <c>CK.Ng.Admin.Sample.App.WorkspaceUsers.GetWorkspaceUsersCommandHandler</c>.
/// </summary>
[ReplaceAutoService( typeof( CK.UserManagement.UserBanned.BannedWorkspaceUsersHandler ) )]
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
