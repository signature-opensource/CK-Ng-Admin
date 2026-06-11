using CK.Core;
using CK.Ng.AspNet.Auth.Basic;
using CK.Ng.Cris.AspNet.Auth;
using CK.TypeScript;

namespace CK.Ng.Admin.Sample.App;

[TypeScriptPackage]
[Requires<AspNetAuthBasicPackage, CrisAspNetAuthPackage>]
[Requires<AdminTSPackage>]
[Requires<UserManagement.UserManagementTSPackage>]
public class AdminSamplePackage : TypeScriptPackage
{
}
