using System.Text;
using CK.Core;
using CK.DB.Actor.ActorEMail;
using CK.DB.Auth;
using CK.DB.User.NamedUser;
using CK.DB.User.UserPassword;
using CK.DB.UserInvitation;
using CK.DB.Zone;
using CK.IO.UserInvitation;
using CK.IO.UserManagement;
using CK.SqlServer;

namespace CK.UserManagement;

/// <summary>
/// Business logic for workspace invitations and user registration, built on the standard CK.DB
/// packages. Invitations are persisted by <c>CK.DB.UserInvitation</c> (<c>CK.tUserInvitation</c> and
/// its group/provider satellite tables). The invitation is keyed by the invited e-mail
/// (<c>UserTargetAddress</c>, unique platform-wide); the target culture and the groups the user will
/// join are carried by the invitation itself. Every invitation is created on behalf of the system
/// user so any administrator can list, resend or destroy it and the (anonymous) registration flow can
/// finalize it. The workspace an invitation belongs to is derived from the zone of its groups.
/// Sending the actual e-mail is delegated to <see cref="IUserManagementMailer"/>.
/// </summary>
public class UserManagementService : IAutoService
{
    // Every invitation action is performed on behalf of the system user (the invitation creator),
    // so any administrator can manage it and the anonymous registration flow can destroy it.
    const int SystemActorId = 1;

    readonly PocoDirectory _pocoDir;
    readonly CK.DB.UserInvitation.Package _invitationPackage;
    readonly UserInvitationTable _invitationTable;
    readonly CK.DB.User.PreferredCulture.Package _userPackage;
    readonly ActorEMailTable _emailTable;
    readonly NamedUserTable _namedUserTable;
    readonly UserPasswordTable _passwordTable;
    readonly GroupTable _groupTable;
    readonly UserTable _userTable;
    readonly CK.DB.Workspace.Package _workspacePackage;
    readonly UserManagementQueries _queries;
    readonly IUserManagementMailer _mailer;

    public UserManagementService( PocoDirectory pocoDir,
                                  CK.DB.UserInvitation.Package invitationPackage,
                                  UserInvitationTable invitationTable,
                                  CK.DB.User.PreferredCulture.Package userPackage,
                                  ActorEMailTable emailTable,
                                  NamedUserTable namedUserTable,
                                  UserPasswordTable passwordTable,
                                  GroupTable groupTable,
                                  UserTable userTable,
                                  CK.DB.Workspace.Package workspacePackage,
                                  UserManagementQueries queries,
                                  IUserManagementMailer mailer )
    {
        _pocoDir = pocoDir;
        _invitationPackage = invitationPackage;
        _invitationTable = invitationTable;
        _userPackage = userPackage;
        _emailTable = emailTable;
        _namedUserTable = namedUserTable;
        _passwordTable = passwordTable;
        _groupTable = groupTable;
        _userTable = userTable;
        _workspacePackage = workspacePackage;
        _queries = queries;
        _mailer = mailer;
    }

    /// <summary>
    /// Creates (or replaces) the invitation for an e-mail and sends the invitation e-mail.
    /// Because <c>UserTargetAddress</c> is unique platform-wide, any existing pending invitation for
    /// the same e-mail is destroyed first so the culture and groups always reflect the latest input.
    /// </summary>
    public async Task CreateInvitationAsync( ISqlTransactionCallContext ctx, int workspaceId, string email, string cultureName, IReadOnlyList<int> groups )
    {
        var existing = await _invitationPackage.GetUserInvitationAsync( ctx, SystemActorId, email );
        if( existing is not null )
        {
            await DestroyInvitationAsync( ctx, existing.InvitationId );
        }

        var cultureId = NormalizedCultureInfo.EnsureNormalizedCultureInfo( cultureName ).Id;
        var create = _pocoDir.Create<ICreateUserInvitationCommand>( c =>
        {
            c.ActorId = SystemActorId;
            c.UserTargetAddress = email;
            c.ExpirationDateUtc = DateTime.UtcNow.AddDays( 3 );
            c.IsActive = true;
            c.CultureId = cultureId;
            foreach( var g in groups.Where( g => g > 0 ) ) c.GroupIdentifiers.Add( g );
        } );
        var invitation = await _invitationPackage.CreateUserInvitationAsync( ctx, create );

        ctx.Monitor.Info( $"Invitation created. (Email: {email}, WorkspaceId: {workspaceId}, InvitationId: {invitation.InvitationId})" );
        await SendInvitationMailAsync( ctx, invitation.InvitationId, email, cultureName );
    }

    /// <summary>
    /// Re-activates a pending invitation (extends its expiration) and resends the e-mail.
    /// </summary>
    public async Task ResendInvitationAsync( ISqlCallContext ctx, string email, string cultureName )
    {
        var invitation = await _invitationPackage.GetUserInvitationAsync( ctx, SystemActorId, email );
        if( invitation is null )
        {
            ctx.Monitor.Warn( $"No pending invitation to resend. (Email: {email})" );
            return;
        }

        await _invitationPackage.SetUserInvitationIsActiveAsync( ctx, _pocoDir.Create<ISetUserInvitationIsActiveCommand>( c =>
        {
            c.ActorId = SystemActorId;
            c.InvitationId = invitation.InvitationId;
            c.IsActive = true;
        } ) );
        await _invitationPackage.SetUserInvitationExpirationDateAsync( ctx, _pocoDir.Create<ISetUserInvitationExpirationDateCommand>( c =>
        {
            c.ActorId = SystemActorId;
            c.InvitationId = invitation.InvitationId;
            c.NewExpirationDate = DateTime.UtcNow.AddDays( 3 );
        } ) );

        ctx.Monitor.Info( $"Invitation re-activated. (Email: {email})" );
        await SendInvitationMailAsync( ctx, invitation.InvitationId, email, cultureName );
    }

    /// <summary>
    /// Validates an invitation secret and returns the pending user (e-mail + default culture).
    /// </summary>
    public async Task<IPendingUser> ValidateInvitationAsync( ISqlCallContext ctx, string token )
    {
        var invitation = await CheckInvitationAsync( ctx, token );
        return _pocoDir.Create<IPendingUser>( u =>
        {
            u.Email = invitation.UserTargetAddress;
            u.DefaultXLCID = invitation.CultureId;
        } );
    }

    /// <summary>
    /// Completes a registration: creates the user, sets names/password, joins the invitation groups,
    /// sets the preferred workspace then destroys the invitation.
    /// </summary>
    public async Task CompleteRegistrationAsync( ISqlCallContext ctx,
                                                 string firstName,
                                                 string lastName,
                                                 string email,
                                                 string token,
                                                 string password,
                                                 string cultureName )
    {
        var invitation = await CheckInvitationAsync( ctx, token );

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

        var xlcid = NormalizedCultureInfo.EnsureNormalizedCultureInfo( cultureName ).Id;
        await _userTable.SetExtendedCultureAsync( ctx, SystemActorId, userId, xlcid );
        ctx.Monitor.Info( $"User's extended culture set. (UserId: {userId}, CultureName: {cultureName}, XLCID: {xlcid})" );

        foreach( var g in invitation.GroupIdentifiers )
        {
            await _groupTable.AddUserAsync( ctx, SystemActorId, g, userId, autoAddUserInZone: true );
            ctx.Monitor.Trace( $"User added to group. (UserId: {userId}, GroupId: {g})" );
        }

        var workspaceId = await _queries.GetWorkspaceIdForGroupsAsync( ctx, invitation.GroupIdentifiers );
        if( workspaceId > 0 )
        {
            await _workspacePackage.SetUserPreferredWorkspaceAsync( ctx, SystemActorId, userId, workspaceId );
            ctx.Monitor.Trace( $"Preferred workspace set. (UserId: {userId}, WorkspaceId: {workspaceId})" );
        }

        await DestroyInvitationAsync( ctx, invitation.InvitationId );
        ctx.Monitor.Info( $"Invitation finalized and destroyed. (InvitationId: {invitation.InvitationId})" );
    }

    /// <summary>
    /// Resolves and validates an invitation from its secret. Mirrors the previous TokenStore check:
    /// the invitation must exist, be active and not be expired.
    /// </summary>
    async Task<IUserInvitation> CheckInvitationAsync( ISqlCallContext ctx, string token )
    {
        if( string.IsNullOrWhiteSpace( token ) ) throw new InvalidOperationException( "User.InvitationError" );

        var invitation = await _invitationPackage.GetUserInvitationAsync( ctx, Encoding.UTF8.GetBytes( token ) );
        if( invitation is null || !invitation.IsActive || invitation.ExpirationDateUtc < DateTime.UtcNow )
        {
            ctx.Monitor.Error( "Could not validate the invitation token." );
            throw new InvalidOperationException( "User.InvitationError" );
        }
        return invitation;
    }

    async Task DestroyInvitationAsync( ISqlCallContext ctx, int invitationId )
    {
        await _invitationPackage.DestroyUserInvitationAsync( ctx, _pocoDir.Create<IDestroyUserInvitationCommand>( c =>
        {
            c.ActorId = SystemActorId;
            c.InvitationId = invitationId;
        } ) );
    }

    /// <summary>
    /// Reads the invitation secret and dispatches the invitation e-mail with the registration link.
    /// </summary>
    async Task SendInvitationMailAsync( ISqlCallContext ctx, int invitationId, string email, string cultureName )
    {
        var secret = await _invitationTable.GetUserInvitationSecretAsync( ctx, SystemActorId, invitationId );
        if( secret is null )
        {
            ctx.Monitor.Error( $"Could not read the invitation secret. (InvitationId: {invitationId})" );
            return;
        }
        await _mailer.SendUserInvitationAsync( ctx.Monitor, email, Encoding.UTF8.GetString( secret ), cultureName );
    }
}
