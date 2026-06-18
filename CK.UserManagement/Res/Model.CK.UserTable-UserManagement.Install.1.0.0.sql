--<beginscript>
if not exists(
  SELECT *
  FROM   sys.columns
  WHERE  object_id = OBJECT_ID(N'CK.tUser')
         AND ( name = 'ExtendedCultureId' or name = 'BinDate' )
)
begin
    alter table CK.tUser add ExtendedCultureId int not null
        constraint FK_CK_tUser_ExtendedCultureId foreign key( ExtendedCultureId ) references CK.tCulture( CultureId )
        constraint DF_CK_tUser_ExtendedCultureId default( 210327884 );

    alter table CK.tUser add BinDate datetime2( 2 ) null;
end
--<endscript>
