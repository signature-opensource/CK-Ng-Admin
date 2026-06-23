--<beginscript>
if not exists(
  SELECT *
  FROM   sys.columns
  WHERE  object_id = OBJECT_ID(N'CK.tUser')
         AND name = 'BinDate'
)
begin
    alter table CK.tUser add BinDate datetime2( 2 ) null;
end
--<endscript>
