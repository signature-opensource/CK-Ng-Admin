create procedure CK.sUserExtendedCultureSet
(
    @ActorId int,
    @UserId int,
    @ExtendedCultureId int
)
as
begin
    if @ActorId <= 0 throw 50000, 'Security.AnonymousNotAllowed', 1;
    if @UserId <= 0 throw 50000, 'User.InvalidUserId', 1;
    if not exists( select 1 from CK.tCulture where CultureId = @ExtendedCultureId )
        throw 50000, 'User.InvalidExtendedCultureId', 1;

    update CK.tUser
    set ExtendedCultureId = @ExtendedCultureId
    where UserId = @UserId;
end
