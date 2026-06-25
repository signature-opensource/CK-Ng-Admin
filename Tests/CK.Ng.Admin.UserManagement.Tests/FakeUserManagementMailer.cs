using CK.Core;
using CK.IO.UserManagement;
using CK.UserManagement.Mail;

namespace CK.Ng.Admin.UserManagement.Tests;

/// <summary>
/// Replaces <see cref="UserManagementMailer"/> so invitation commands succeed without the
/// Fluid/branding/AppIdentity/SMTP infrastructure. See the backend test project's twin for details.
/// </summary>
[ReplaceAutoService( typeof( UserManagementMailer ) )]
public sealed class FakeUserManagementMailer : IUserManagementMailer
{
    public Task SendUserInvitationAsync( IActivityMonitor monitor, string destination, string token, string cultureName )
    {
        monitor.Info( $"[FakeMailer] Invitation captured. (Email: {destination})" );
        return Task.CompletedTask;
    }
}
