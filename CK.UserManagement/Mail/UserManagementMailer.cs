using CK.AppIdentity;
using CK.Core;
using CK.IO.UserManagement;
using CK.Mailer;
using CK.Template.Fluid;

namespace CK.UserManagement.Mail;

/// <summary>
/// Default <see cref="IUserManagementMailer"/>: renders the <c>UserInvitation</c> Fluid templates
/// (subject + HTML body) for the requested culture and dispatches through the
/// CK-AppIdentity-configured <see cref="IDefaultEmailSender"/> (SMTP / pickup directory / no-send
/// are all driven by <c>CK-AppIdentity:Local:EmailSender</c>). The sender address comes from that
/// same configuration.
/// </summary>
public class UserManagementMailer : IUserManagementMailer
{
    // Used when no CK-AppIdentity:Local:FrontUrl is configured (e.g. dev without explicit config).
    const string DefaultFrontUrl = "http://localhost:4200";

    readonly IFluidTemplateService _fluid;
    readonly PocoDirectory _pocoDir;
    readonly IDefaultEmailSender _emailSender;
    readonly string _frontUrl;

    public UserManagementMailer( IFluidTemplateService fluid,
                                 PocoDirectory pocoDir,
                                 IDefaultEmailSender emailSender,
                                 IApplicationIdentityService appIdentity )
    {
        _fluid = fluid;
        _pocoDir = pocoDir;
        _emailSender = emailSender;

        // FrontUrl lives at CK-AppIdentity:Local:FrontUrl (links must be absolute since invitation
        // commands may run without an HTTP request context). Falls back to a dev default.
        var configured = appIdentity.LocalConfiguration.Configuration["FrontUrl"];
        _frontUrl = string.IsNullOrWhiteSpace( configured ) ? DefaultFrontUrl : configured.TrimEnd( '/' );
    }

    public async Task SendUserInvitationAsync( IActivityMonitor monitor, string destination, string token, string cultureName )
    {
        var culture = NormalizedCultureInfo.EnsureNormalizedCultureInfo( string.IsNullOrEmpty( cultureName ) ? "fr" : cultureName );
        var model = _pocoDir.Create<IUserInvitationModel>( m =>
        {
            m.FrontUrl = _frontUrl;
            m.Token = token;
        } );

        var subject = await _fluid.RenderAsync( "UserInvitation.Subject", culture, model );
        var body = await _fluid.RenderAsync( "UserInvitation.Body", culture, model );

        var message = new SimpleEmail { Subject = subject, HtmlBody = body };
        message.To( destination );
        await _emailSender.SendAsync( monitor, message );

        monitor.Info( $"User invitation e-mail sent. (Email: {destination}, Culture: {culture.Name})" );
    }
}
