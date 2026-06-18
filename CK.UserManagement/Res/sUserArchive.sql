create procedure CK.sUserArchive
(
    @ActorId int,
    @UserId int
)
as
begin
    if @ActorId <= 0 throw 50000, 'Security.AnonymousNotAllowed', 1;
    if @UserId <= 0 throw 50000, 'User.InvalidUserId', 1;

    declare @IsPlatformAdmin bit = CK.fIsUserPlatformAdmin( @ActorId );

    if @IsPlatformAdmin = 0
        throw 50000, 'Security.PlatformAdministratorOnly', 1;

    if exists( select 1 from CK.tUser where UserId = @UserId )
    begin
        update CK.tUser
        set BinDate = sysutcdatetime()
        where UserId = @UserId;
    end
end
