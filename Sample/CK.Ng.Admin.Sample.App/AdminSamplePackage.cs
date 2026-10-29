using CK.Core;
using CK.Ng.Cris.AspNet.Authentication;
using CK.Ng.Cris.AspNet.Authentication.Basic;
using CK.TypeScript;

namespace CK.Ng.Admin.Sample.App;

[TypeScriptPackage]
[Requires<NgCrisAuthenticationBasicPackage, NgCrisAuthenticationPackage>]
[Requires<UserManagement.UserManagementTSPackage>]
//[Requires<UserManagement.UserBanned.UserManagementUserBannedPackage>]
//[Requires<UserManagement.UserInvitation.UserManagementUserInvitationPackage>]
[Requires<Ng.UserProfile.PreferredCulture.UserProfilePreferredCulturePackage>]
[Requires<Ng.UserProfile.UserBanned.UserProfileUserBannedPackage>]
public class AdminSamplePackage : TypeScriptPackage
{
}
