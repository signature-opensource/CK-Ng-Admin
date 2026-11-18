using CK.Core;
using CK.TS.Angular;

namespace CK.Ng.AppIdentity.Tenants;

/// <summary>
/// The tenants page, at "/app-identity/tenants" of its client application: an operator at the Critical level sees the
/// applications that hold Opened tenant templates, their templates and their tenants (configured, run-time, unloaded with
/// their reason), creates a tenant (a name), moves a run-time tenant to a free index and removes one.
/// </summary>
[NgRoutedComponent<AppComponent>( Route = "app-identity/tenants", RegistrationMode = RouteRegistrationMode.Lazy )]
[Package<NgAppIdentityTenantsPackage>]
public sealed class TenantsPageComponent : NgRoutedComponent
{
}
