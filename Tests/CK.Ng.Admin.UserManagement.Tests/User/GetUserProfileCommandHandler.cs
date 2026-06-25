using CK.Core;
using CK.Cris;
using CK.IO.Actor;
using CK.SqlServer;

namespace CK.Ng.Admin.UserManagement.Tests.User;

/// <summary>
/// Overrides the default <see cref="IGetUserProfileQCommand"/> handler so the response carries the
/// specialized <see cref="CK.IO.UserProfile.Workspace.IUserProfile"/> shape (PreferredWorkspaceId +
/// Groups) required by the Angular user-service <c>isAdmin</c> signal. Mirrors CK.Ng.Admin.Tests.
/// </summary>
public class GetUserProfileCommandHandler : IAutoService, ICommandHandler<IGetUserProfileQCommand>
{
    readonly UserQueries _queries;

    public GetUserProfileCommandHandler( UserQueries queries )
    {
        _queries = queries;
    }

    [CommandHandler]
    public Task<CK.IO.UserProfile.Workspace.IUserProfile?> GetUserProfileAsync( ISqlCallContext ctx, IGetUserProfileQCommand cmd )
        => _queries.GetUserProfileAsync( ctx, cmd.UserId );
}
