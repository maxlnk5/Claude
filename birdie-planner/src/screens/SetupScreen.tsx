import { CourseEditor } from './setup/CourseEditor';
import { DataPanel } from './setup/DataPanel';
import { ImportPanel } from './setup/ImportPanel';
import { ProfileEditor } from './setup/ProfileEditor';
import { RecordEditor } from './setup/RecordEditor';

export function SetupScreen() {
  return (
    <div className="space-y-4">
      <ProfileEditor />
      <ImportPanel />
      <RecordEditor />
      <CourseEditor />
      <DataPanel />
    </div>
  );
}
