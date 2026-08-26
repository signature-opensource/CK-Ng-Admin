Tenant-specific mail branding for Signature One deployments.

Substitutes the default mail branding provider through `[ReplaceAutoService]`: referencing the assembly
from the host is enough. Ships the Signature defaults for every branding field, each of which an
operator can override one by one through `CK-AppIdentity:Local:MailBranding:*` - configuration always
wins.

The logo travels as an inline CID attachment rather than a remote URL, so it survives the
remote-image blocking of mail clients.
