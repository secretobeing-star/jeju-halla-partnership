import {

  getServerSupabaseEnv,

  isSupabaseEnvConfigured,

  SUPABASE_RUNTIME_CONFIG_ID,

} from "@/lib/supabase-env";



/** 서버 렌더 HTML에 Supabase 공개 설정을 넣어, 클라이언트가 빌드 env 없이도 연결 가능하게 함 */

export default function SupabaseRuntimeConfigScript() {

  const env = getServerSupabaseEnv();



  if (!isSupabaseEnvConfigured(env)) {

    return null;

  }



  const payload = JSON.stringify({ url: env.url, anonKey: env.anonKey });



  return (

    <>

      <script

        id={SUPABASE_RUNTIME_CONFIG_ID}

        type="application/json"

        dangerouslySetInnerHTML={{ __html: payload }}

      />

      <script

        dangerouslySetInnerHTML={{

          __html: `try{var el=document.getElementById(${JSON.stringify(SUPABASE_RUNTIME_CONFIG_ID)});if(el&&el.textContent){window.__SUPABASE_PUBLIC_CONFIG__=JSON.parse(el.textContent);}}catch(e){}`,

        }}

      />

    </>

  );

}


