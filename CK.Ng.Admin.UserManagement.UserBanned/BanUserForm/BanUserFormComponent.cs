using CK.Core;
using CK.TS.Angular;
using CK.TypeScript;

namespace CK.Ng.Admin.UserManagement;

/// <summary>
/// Modal content capturing the banishment parameters (free-text reason and duration) before
/// a <c>SetUserBannedCommand</c> is sent. Every field is rendered by the shared <c>GenericForm</c>:
/// the opener gives the reason field, this component adds the duration select and the end-date
/// picker of a custom duration, whose template it declares.
/// </summary>
[NgComponent]
[Package<UserBanned.UserManagementUserBannedPackage>]
[Requires<Zorro.GenericFormComponent>]
public sealed class BanUserFormComponent : NgComponent
{
}
