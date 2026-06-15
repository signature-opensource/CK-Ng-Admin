using CK.Core;
using CK.DB.Actor.ActorEMail;
using CK.DB.Auth;
using CK.DB.TokenStore;
using CK.DB.User.NamedUser;
using CK.DB.User.UserPassword;
using CK.DB.Zone;
using CK.IO.UserManagement;
using CK.SqlServer;

namespace CK.UserManagement;

/// <summary>
/// Business logic for workspace invitations and user registration, built on the standard CK.DB
/// packages. Invitations are persisted in <c>CK.DB.TokenStore</c>: the scope encodes the target
/// workspace, the key is the invited e-mail and the <c>ExtraData</c> carries the
/// <see cref="InvitationPayload"/> (culture + groups). Sending the actual e-mail is out of scope
/// here and only logged — plug a real mailer where indicated.
/// </summary>
public class UserManagementService : IAutoService
{
    // Every server-side action is performed on behalf of the system user.
    const int SystemActorId = 1;

    readonly PocoDirectory _pocoDir;
    readonly TokenStoreTable _tokenTable;
    readonly CK.DB.User.PreferredCulture.Package _userPackage;
    readonly ActorEMailTable _emailTable;
    readonly NamedUserTable _namedUserTable;
    readonly UserPasswordTable _passwordTable;
    readonly GroupTable _groupTable;
    readonly CK.DB.Workspace.Package _workspacePackage;
    readonly UserManagementQueries _queries;

    public UserManagementService( PocoDirectory pocoDir,
                                  TokenStoreTable tokenTable,
                                  CK.DB.User.PreferredCulture.Package userPackage,
                                  ActorEMailTable emailTable,
                                  NamedUserTable namedUserTable,
                                  UserPasswordTable passwordTable,
                                  GroupTable groupTable,
                                  CK.DB.Workspace.Package workspacePackage,
                                  UserManagementQueries queries )
    {
        _pocoDir = pocoDir;
        _tokenTable = tokenTable;
        _userPackage = userPackage;
        _emailTable = emailTable;
        _namedUserTable = namedUserTable;
        _passwordTable = passwordTable;
        _groupTable = groupTable;
        _workspacePackage = workspacePackage;
        _queries = queries;
    }

    /// <summary>
    /// Creates a workspace invitation token and (would) send the invitation e-mail.
    /// </summary>
    public async Task CreateInvitationAsync( ISqlCallContext ctx, int actorId, int workspaceId, string email, string cultureName, IReadOnlyList<int> groups )
    {
        var info = _tokenTable.CreateInfo();
        info.TokenScope = UserManagementQueries.InvitationScope( workspaceId );
        info.TokenKey = email;
        info.Active = true;
        info.ExpirationDateUtc = DateTime.UtcNow.AddDays( 3 );

        var result = await _tokenTable.CreateAsync( ctx, actorId, info );
        var payload = new InvitationPayload( cultureName, groups.Where( g => g > 0 ).ToList() );
        await _tokenTable.SetExtraDataAsync( ctx, actorId, result.TokenId, payload.Serialize() );

        ctx.Monitor.Info( $"Invitation created. (Email: {email}, WorkspaceId: {workspaceId})" );
        // TODO: send the invitation e-mail carrying 'result.Token' here.
        ctx.Monitor.Info( $"Invitation e-mail would be sent. (Email: {email}, Token: {result.Token})" );
    }

    /// <summary>
    /// Re-activates a pending invitation (extends its expiration) and (would) resend the e-mail.
    /// </summary>
    public async Task ResendInvitationAsync( ISqlCallContext ctx, int actorId, int workspaceId, string email )
    {
        var scope = UserManagementQueries.InvitationScope( workspaceId );
        var token = await _queries.GetInvitationRefAsync( ctx, scope, email );
        if( token is null )
        {
            ctx.Monitor.Warn( $"No pending invitation to resend. (Email: {email}, WorkspaceId: {workspaceId})" );
            return;
        }

        await _tokenTable.ActivateAsync( ctx, actorId, token.Value.TokenId, active: true, expirationDateUtc: DateTime.UtcNow.AddDays( 3 ) );
        ctx.Monitor.Info( $"Invitation re-activated. (Email: {email})" );
        // TODO: resend the invitation e-mail carrying 'token.Value.Token' here.
        ctx.Monitor.Info( $"Invitation e-mail would be resent. (Email: {email}, Token: {token.Value.Token})" );
    }

    /// <summary>
    /// Validates an invitation token and returns the pending user (e-mail + default culture).
    /// </summary>
    public async Task<IPendingUser> ValidateInvitationAsync( ISqlCallContext ctx, string token )
    {
        var info = await CheckInvitationAsync( ctx, token );
        var payload = InvitationPayload.Deserialize( info.ExtraData );
        var xlcid = NormalizedCultureInfo.EnsureNormalizedCultureInfo( payload.CultureName ).Id;

        return _pocoDir.Create<IPendingUser>( u =>
        {
            u.Email = info.TokenKey ?? string.Empty;
            u.DefaultXLCID = xlcid;
        } );
    }

    /// <summary>
    /// Completes a registration: creates the user, sets names/password, joins the invitation groups,
    /// sets the preferred workspace then destroys the invitation token.
    /// </summary>
    public async Task CompleteRegistrationAsync( ISqlCallContext ctx,
                                                 string firstName,
                                                 string lastName,
                                                 string email,
                                                 string token,
                                                 string password,
                                                 string cultureName )
    {
        var info = await CheckInvitationAsync( ctx, token );
        var payload = InvitationPayload.Deserialize( info.ExtraData );

        var userId = await _userPackage.CreateUserAsync( ctx, SystemActorId, email, cultureName );
        if( userId <= 0 )
        {
            ctx.Monitor.Warn( $"User already exists. (UserName: {email})" );
            throw new ArgumentException( "User.InvitationError" );
        }
        ctx.Monitor.Info( $"User created. (UserId: {userId}, UserName: {email})" );

        await _emailTable.AddEMailAsync( ctx, SystemActorId, userId, email, isPrimary: true );
        await _namedUserTable.SetNamesAsync( ctx, SystemActorId, userId, firstName, lastName );
        await _passwordTable.CreateOrUpdatePasswordUserAsync( ctx, SystemActorId, userId, password, UCLMode.CreateOnly );

        foreach( var g in payload.Groups )
        {
            await _groupTable.AddUserAsync( ctx, SystemActorId, g, userId, autoAddUserInZone: true );
            ctx.Monitor.Trace( $"User added to group. (UserId: {userId}, GroupId: {g})" );
        }

        var workspaceId = ParseWorkspaceId( info.TokenScope );
        if( workspaceId > 0 )
        {
            await _workspacePackage.SetUserPreferredWorkspaceAsync( ctx, SystemActorId, userId, workspaceId );
            ctx.Monitor.Trace( $"Preferred workspace set. (UserId: {userId}, WorkspaceId: {workspaceId})" );
        }

        await _tokenTable.DestroyAsync( ctx, info.CreatedById, info.TokenId );
        ctx.Monitor.Info( $"Invitation finalized and token destroyed. (TokenId: {info.TokenId})" );
    }

    async Task<ITokenInfo> CheckInvitationAsync( ISqlCallContext ctx, string token )
    {
        if( string.IsNullOrWhiteSpace( token ) ) throw new InvalidOperationException( "User.InvitationError" );

        var info = await _tokenTable.CheckAsync( ctx, SystemActorId, token );
        if( info is null || info.TokenId <= 0 || !info.Active || info.ExpirationDateUtc < DateTime.UtcNow )
        {
            ctx.Monitor.Error( "Could not validate the invitation token." );
            throw new InvalidOperationException( "User.InvitationError" );
        }
        return info;
    }

    static int ParseWorkspaceId( string? tokenScope )
    {
        // Scope shape: "WorkspaceInvitation.{workspaceId}".
        if( tokenScope is null ) return 0;
        var dot = tokenScope.LastIndexOf( '.' );
        return dot >= 0 && int.TryParse( tokenScope.AsSpan( dot + 1 ), out var id ) ? id : 0;
    }
}
