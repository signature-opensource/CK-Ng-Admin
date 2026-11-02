using CK.Core;
using CK.IO.Actor;
using CK.TS.Angular;
using CK.TypeScript;

namespace CK.Ng.Admin.UserManagement;

[NgComponent]
[Package<UserInvitation.UserManagementUserInvitationPackage>]
[Requires<Zorro.GenericFormComponent>]
public sealed class UserFormComponent : NgComponent
{
}
