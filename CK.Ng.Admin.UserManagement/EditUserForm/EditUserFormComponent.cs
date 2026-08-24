using CK.Core;
using CK.Ng.UserProfile.UserPassword;
using CK.TS.Angular;

namespace CK.Ng.Admin.UserManagement;

[NgComponent]
[Package<UserManagementTSPackage>]
[Requires<PasswordStrengthComponent>]
public sealed class EditUserFormComponent : NgComponent
{
}
