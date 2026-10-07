import { Home } from "./home/Home";
import { LessonPage } from "./lesson/LessonPage";
import { MapPage } from "./map/MapPage";
import { useRoute } from "./router";

export const App = () => {
  const route = useRoute();
  const [page] = route.path;
  return (
    <>
      {page === "map" ? <MapPage /> : page === "lesson" ? <LessonPage query={route.query} /> : <Home />}
      <div className="grain" />
    </>
  );
};
