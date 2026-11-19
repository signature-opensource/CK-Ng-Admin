using CK.Core;
using CK.IO.AppIdentity.Tenants;
using CK.Ng.Cris.AspNet.Authentication;
using CK.TypeScript;

namespace CK.Ng.AppIdentity.Tenants;

/// <summary>
/// The tenants page of the System (see <see cref="TenantsPageComponent"/>): the applications that hold Opened tenant
/// templates are found among the remotes of the party of the client application and of the hub of the System (its
/// Authentication Center); the page sends the tenant commands to them (through the hub when they are not remotes: see
/// CK.AppIdentity.Tenants, that the application of the page references too).
/// </summary>
[TypeScriptPackage]
[Requires<NgCrisAuthenticationPackage>]
[RegisterTypeScriptType( typeof( IGetTenantHostsQCommand ) )]
[RegisterTypeScriptType( typeof( IGetTenantInstancesQCommand ) )]
[RegisterTypeScriptType( typeof( ICreateTenantInstanceCommand ) )]
[RegisterTypeScriptType( typeof( ISetTenantIndexCommand ) )]
[RegisterTypeScriptType( typeof( IRemoveTenantInstanceCommand ) )]
public class NgAppIdentityTenantsPackage : TypeScriptPackage
{
}
