using CK.Core;
using CK.Ng.AspNet.Auth.Basic;
using CK.Ng.Cris.AspNet.Auth;
using CK.TypeScript;

namespace CK.Ng.Admin.Sample.App;

[TypeScriptPackage]
[Requires<AspNetAuthBasicPackage, CrisAspNetAuthPackage>]
[Requires<UserManagement.UserManagementTSPackage>]
//[Requires<UserManagement.BinnedUser.UserManagementBinnedUserPackage>]
//[Requires<UserManagement.UserInvitation.UserManagementUserInvitationPackage>]
[Requires<Ng.UserProfile.PreferredCulture.UserProfilePreferredCulturePackage>]
public class AdminSamplePackage : TypeScriptPackage
{
}
