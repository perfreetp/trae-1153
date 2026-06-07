import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import Home from '@/pages/Home';
import Materials from '@/pages/Materials';
import Recipe from '@/pages/Recipe';
import Timeline from '@/pages/Timeline';
import Trials from '@/pages/Trials';
import TrialDetail from '@/pages/TrialDetail';
import Cost from '@/pages/Cost';
import Review from '@/pages/Review';
import ArchivePage from '@/pages/ArchivePage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/recipe" element={<Recipe />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/trials" element={<Trials />} />
          <Route path="/trials/:id" element={<TrialDetail />} />
          <Route path="/cost" element={<Cost />} />
          <Route path="/review" element={<Review />} />
          <Route path="/archive" element={<ArchivePage />} />
        </Route>
      </Routes>
    </Router>
  );
}
