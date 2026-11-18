using CK.Core;
using CK.IO.AppIdentity.Tenants;
using CK.Ng.Cris.AspNet.Authentication;
using CK.TypeScript;

namespace CK.Ng.AppIdentity.Tenants;

/// <summary>
/// The tenants page of the System (see <see cref="TenantsPageComponent"/>): the applications that hold Opened tenant
/// templates are the hosts of the "Tenants" route that reach the party of the client application; the page sends the
/// tenant commands to them (along the route beyond one hop: see CK.AppIdentity.Tenants).
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
