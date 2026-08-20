using CK.Core;
using CK.TS.Angular;
using CK.TypeScript;

namespace CK.Ng.Admin.UserManagement;

/// <summary>
/// Modal content capturing the banishment parameters (free-text reason and duration) before
/// a <c>SetUserBannedCommand</c> is sent. The reason field is rendered by the shared
/// <c>GenericForm</c>; this component owns the duration select and its optional end-date picker.
/// </summary>
[NgComponent]
[Package<UserBanned.UserManagementUserBannedPackage>]
public sealed class BanUserFormComponent : NgComponent
{
}
