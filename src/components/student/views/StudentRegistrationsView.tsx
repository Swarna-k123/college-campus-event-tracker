import { MyRegistrationsList } from "@/components/student/StudentEventsContext";

export const StudentRegistrationsView = () => {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">My Registrations</h1>
        <p className="text-muted-foreground">Review the events you've signed up for and keep track of what is coming up.</p>
      </header>

      <MyRegistrationsList />
    </div>
  );
};
