using CK.Core;
using CK.SqlServer;

namespace CK.UserManagement;

[SqlTable( "tUser", ResourcePath = "Res", Package = typeof( Package ) )]
[Versions( "1.0.0" )]
[SqlObjectItem( "transform:vUser" )]
public abstract class UserTable : DB.Actor.UserTable
{
    void StObjConstruct(  DB.Acl.Package aclPackage ) { }


    /// <summary>
    /// Defines whether a user is a platform administrator.
    /// </summary>
    /// <param name="ctx">The call context.</param>
    /// <param name="actorId">The acting actor identifier.</param>
    /// <returns>True if user is a platform admin, false otherwise.</returns>
    [SqlScalarFunction( "fIsUserPlatformAdmin" )]
    public abstract Task<bool> IsUserPlatformAdminAsync( ISqlCallContext ctx, int actorId );

    /// <summary>
    /// Archives a user if it exists.
    /// </summary>
    /// <param name="ctx">The call context.</param>
    /// <param name="actorId">The acting actor identifier. Throws if not platform administrator.</param>
    /// <param name="userId">The user identifier.</param>
    /// <returns>An awaitable.</returns>
    [SqlProcedure( "sUserArchive" )]
    public abstract Task ArchiveUserAsync( ISqlCallContext ctx, int actorId, int userId );

    /// <summary>
    /// Restores an archived user if it exists.
    /// </summary>
    /// <param name="ctx">The call context.</param>
    /// <param name="actorId">The acting actor identifier. Throws if not platform administrator.</param>
    /// <param name="userId">The user identifier.</param>
    /// <returns>An awaitable.</returns>
    [SqlProcedure( "sUserRestore" )]
    public abstract Task RestoreUserAsync( ISqlCallContext ctx, int actorId, int userId );

    /// <summary>
    /// Sets the user's extended culture (XLCID, referencing <c>CK.tCulture</c>).
    /// </summary>
    /// <param name="ctx">The call context.</param>
    /// <param name="actorId">The acting actor identifier.</param>
    /// <param name="userId">The user identifier.</param>
    /// <param name="extendedCultureId">The extended culture identifier (XLCID). Must exist in <c>CK.tCulture</c>.</param>
    /// <returns>An awaitable.</returns>
    [SqlProcedure( "sUserExtendedCultureSet" )]
    public abstract Task SetExtendedCultureAsync( ISqlCallContext ctx, int actorId, int userId, int extendedCultureId );
}
