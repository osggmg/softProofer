import { MainPage } from "./components/MainPage";
import { useEffect, useState } from "react";
import { lcms } from "./profile_transformations/lcmsSingleton";

export function App() {
  const [lcmsReady, setLcmsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await lcms.init();
      if (!cancelled) setLcmsReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!lcmsReady) return null;
  
  return (
    <>
      <MainPage />
    </>
  );
}

export default App;
