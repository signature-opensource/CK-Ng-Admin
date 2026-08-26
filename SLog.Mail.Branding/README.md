# SLog.Mail.Branding

Tenant-specific mail branding for Signature One deployments. This is not a CKomposable Angular package
and not part of the admin feature set - it is a small DI substitution that changes how the e-mails sent
by the platform look.

> This is the one package of this repository that is neither `CK.*` nor part of the `/admin` page. It
> is packable and published like the others. If it were ever meant to stay private to a deployment, its
> `.csproj` would need `<IsPackable>false</IsPackable>`.

## What it brings.

[`SignatureMailBrandingProvider`](SignatureMailBrandingProvider.cs), an `IMailBrandingProvider` that
replaces `DefaultMailBrandingProvider` through `[ReplaceAutoService]`. **Referencing the assembly from
the host is enough** for CK DI to pick it up - there is nothing to register.

It ships Signature brand defaults for every `IMailBranding` field (colors, footer, brand name), and
supplies the Signature logo as the embedded resource
[`Res/signature-one-blanc.png`](Res/signature-one-blanc.png).

## Requires.

- `CK.AppIdentity.Abstractions`, `CK.Mail.SharedLayout`

## Configuration always wins.

Every field is read from `CK-AppIdentity:Local:MailBranding:*` first, with the Signature value as the
fallback:

```csharp
b.LogoUrl   = section?["LogoUrl"]   ?? string.Empty;
b.BrandName = section?["BrandName"] ?? "Signature One";
```

So an operator overrides a single colour or the footer text in `appsettings` without forking the
package. `LogoUrl` stays empty on purpose - see below.

## The logo travels inline, not by URL.

The logo is served through a `cid:mailLogo` MIME attachment rather than a remote image link. That is
what avoids the client-side remote-image blocking - the "click to download images" banner of Outlook -
which would otherwise leave the mail unbranded for a large share of recipients. This is also why
`LogoUrl` is deliberately left empty by default.
