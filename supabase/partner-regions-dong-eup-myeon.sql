-- 제휴 지역: 제주시/서귀포시 + 동·읍·면 (동/읍/면 단독 구조에서 복구)

update public.site_settings
set partner_regions = jsonb_build_array(
  jsonb_build_object(
    'id', 'jeju-city',
    'label', '제주시',
    'areas', jsonb_build_array(
      '이도1동', '이도2동', '도남동', '건입동', '노형동', '도두동', '봉개동',
      '삼도1동', '삼도2동', '삼양동', '아라동', '월평동', '연동', '오라동',
      '외도동', '용담1동', '용담2동', '이호동', '일도1동', '일도2동', '화북동',
      '구좌읍', '애월읍', '조천읍', '한림읍',
      '우도면', '한경면', '추자면',
      '기타'
    )
  ),
  jsonb_build_object(
    'id', 'seogwipo-city',
    'label', '서귀포시',
    'areas', jsonb_build_array(
      '대륜동', '대천동', '동홍동', '서홍동', '송산동', '영천동',
      '예래동', '정방동', '중문동', '대포동', '중앙동', '천지동', '효돈동',
      '남원읍', '대정읍', '성산읍',
      '안덕면', '표선면',
      '기타'
    )
  )
)
where id = 1;

-- 동/읍/면 단독 형식 → 제주시/서귀포시 형식으로 복구
update public.partners set region = '제주시/연동' where region in ('동/연동', '동/제원');
update public.partners set region = '제주시/아라동' where region = '동/아라동';
update public.partners set region = '제주시/노형동' where region = '동/노형동';
update public.partners set region = '제주시/이도1동' where region = '동/이도1동';
update public.partners set region = '제주시/삼도1동' where region = '동/삼도1동';
update public.partners set region = '제주시/오라동' where region = '동/오라동';
update public.partners set region = '서귀포시/중문동' where region = '동/중문동';
update public.partners set region = '서귀포시/중앙동' where region = '동/중앙동';
update public.partners set region = '서귀포시/대정읍' where region = '읍/대정읍';
update public.partners set region = '서귀포시/남원읍' where region = '읍/남원읍';
update public.partners set region = '서귀포시/성산읍' where region = '읍/성산읍';
update public.partners set region = '서귀포시/표선면' where region = '면/표선면';
update public.partners set region = '제주시' where region = '동';
update public.partners set region = '제주시/아라동' where region = '제주시/아라';
update public.partners set region = '제주시/연동' where region = '제주시/연동';
update public.partners set region = '제주시/노형동' where region = '제주시/노형';
update public.partners set region = '제주시/이도1동' where region = '제주시/이도';
update public.partners set region = '제주시/삼도1동' where region = '제주시/삼도';
update public.partners set region = '제주시/오라동' where region = '제주시/오라';
update public.partners set region = '서귀포시/중문동' where region = '서귀포시/중문';
update public.partners set region = '서귀포시/중앙동' where region = '서귀포시/서귀동';
update public.partners set region = '서귀포시/대정읍' where region = '서귀포시/대정';
update public.partners set region = '서귀포시/남원읍' where region = '서귀포시/남원';
update public.partners set region = '서귀포시/표선면' where region = '서귀포시/표선';
update public.partners set region = '서귀포시/성산읍' where region = '서귀포시/성산';

notify pgrst, 'reload schema';
