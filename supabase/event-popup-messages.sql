-- 이벤트 스탬프 팝업 문구 커스텀 기능을 위한 컬럼 추가
-- site_events 테이블에 팝업 메시지 및 도장 버튼 라벨 컬럼 추가

ALTER TABLE site_events 
ADD COLUMN IF NOT EXISTS distance_error_message TEXT DEFAULT '제휴처와의 거리가 {distance}m 남았습니다. 지정된 반경({radius}m) 내에서 도장을 찍어주세요.',
ADD COLUMN IF NOT EXISTS win_popup_message TEXT,
ADD COLUMN IF NOT EXISTS lose_popup_message TEXT,
ADD COLUMN IF NOT EXISTS completion_popup_message TEXT,
ADD COLUMN IF NOT EXISTS stamp_btn_label TEXT DEFAULT '도장 찍기';

-- 기존 데이터에 기본값 설정 (선택 사항)
UPDATE site_events 
SET distance_error_message = '제휴처와의 거리가 {distance}m 남았습니다. 지정된 반경({radius}m) 내에서 도장을 찍어주세요.'
WHERE distance_error_message IS NULL OR distance_error_message = '';

UPDATE site_events 
SET stamp_btn_label = '도장 찍기'
WHERE stamp_btn_label IS NULL OR stamp_btn_label = '';