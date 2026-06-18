using CK.AppIdentity;
using CK.Core;
using CK.Mail.SharedLayout;
using System.IO;
using System.Linq;

namespace SLog.Mail.Branding;

/// <summary>
/// Tenant-specific <see cref="IMailBrandingProvider"/> for Signature One
/// deployments. Overrides <see cref="DefaultMailBrandingProvider"/> via
/// <see cref="ReplaceAutoServiceAttribute"/> — simply referencing this
/// assembly from the host is enough for CK DI to pick it up.
/// </summary>
/// <remarks>
/// <para>
/// Ships Signature brand defaults for every <see cref="IMailBranding"/>
/// field (colors, footer, brand name). Operators can override any single
/// field via <c>CK-AppIdentity:Local:MailBranding:*</c> in appsettings
/// without forking the package — config always wins.
/// </para>
/// <para>
/// Supplies the Signature logo as an embedded resource served through a
/// <c>cid:mailLogo</c> MIME attachment, avoiding client-side remote-image
/// blocking (Outlook's "click to download images" banner).
/// </para>
/// </remarks>
[ReplaceAutoService( typeof( DefaultMailBrandingProvider ) )]
public sealed class SignatureMailBrandingProvider : IMailBrandingProvider
{
    const string LogoResourceSuffix = "signature-one-blanc.png";

    readonly IMailBranding _branding;
    readonly string _logoResourceName;

    public SignatureMailBrandingProvider( PocoDirectory pocoDirectory,
                                          IApplicationIdentityService appIdentity )
    {
        var section = appIdentity.LocalConfiguration.Configuration.TryGetSection( "MailBranding" );
        _branding = pocoDirectory.Create<IMailBranding>( b =>
        {
            // Per-field: config wins, Signature default fallback.
            // LogoUrl stays empty — Signature always ships inline via CID (OpenLogo).
            b.LogoUrl               = section?["LogoUrl"]               ?? string.Empty;
            b.BrandName             = section?["BrandName"]             ?? "Signature One";
            b.PrimaryColor          = section?["PrimaryColor"]          ?? "#009a9c";
            b.PrimaryColorHover     = section?["PrimaryColorHover"]     ?? "#007778";
            b.HeaderBackgroundColor = section?["HeaderBackgroundColor"] ?? "#1a1c20";
            b.FooterAddress         = section?["FooterAddress"]         ?? "29 avenue de l'Industrie, 42390 Villars";
            b.FooterPhone           = section?["FooterPhone"]           ?? "04 77 35 55 64";
            b.FooterEmail           = section?["FooterEmail"]           ?? "contact@signature.one";
        } );

        // Resolve once — tolerates CK auto-embed's "ck@Res/..." prefix and
        // standard .NET namespace-dotted naming alike.
        var asm = typeof( SignatureMailBrandingProvider ).Assembly;
        _logoResourceName = asm.GetManifestResourceNames()
            .FirstOrDefault( n => n.EndsWith( LogoResourceSuffix, System.StringComparison.Ordinal ) )
            ?? throw new System.InvalidOperationException(
                $"Embedded resource ending with '{LogoResourceSuffix}' was not found in assembly '{asm.GetName().Name}'." );
    }

    public IMailBranding GetBranding() => _branding;

    public string LogoContentId => "mailLogo";

    public string LogoContentType => "image/png";

    public Stream? OpenLogo()
        => typeof( SignatureMailBrandingProvider ).Assembly.GetManifestResourceStream( _logoResourceName );
}
