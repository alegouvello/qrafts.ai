import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, FileText, CheckCircle2 } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

interface Feedback {
  id: string;
  created_at: string;
  category: string;
  status: string;
}

interface FeedbackChartsProps {
  feedback: Feedback[];
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '0.5rem',
};

export const FeedbackCharts = ({ feedback }: FeedbackChartsProps) => {
  const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });

  const trendData = days.map(day => {
    const dayStart = startOfDay(day);
    const dayFeedback = feedback.filter(f => startOfDay(new Date(f.created_at)).getTime() === dayStart.getTime());
    return {
      date: format(day, "MMM dd"),
      total: dayFeedback.length,
    };
  });

  const categoryData = ["feature", "bug", "improvement", "other"].map(cat => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    count: feedback.filter(f => f.category === cat).length,
  }));

  const statusTrendData = days.map(day => {
    const dayStart = startOfDay(day);
    const upToDay = feedback.filter(f => startOfDay(new Date(f.created_at)) <= dayStart);
    return {
      date: format(day, "MMM dd"),
      pending: upToDay.filter(f => f.status === "pending").length,
      inProgress: upToDay.filter(f => f.status === "in_progress").length,
      resolved: upToDay.filter(f => f.status === "resolved").length,
      closed: upToDay.filter(f => f.status === "closed").length,
    };
  });

  const tickFill = 'hsl(var(--muted-foreground))';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Feedback Trends</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Feedback Submissions (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" tick={{ fill: tickFill }} />
                <YAxis tick={{ fill: tickFill }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} name="Total Feedback" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              Feedback by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" tick={{ fill: tickFill }} />
                <YAxis tick={{ fill: tickFill }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Cumulative Status Distribution (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={statusTrendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" tick={{ fill: tickFill }} />
              <YAxis tick={{ fill: tickFill }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Area type="monotone" dataKey="resolved" stackId="1" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.6} name="Resolved" />
              <Area type="monotone" dataKey="inProgress" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} name="In Progress" />
              <Area type="monotone" dataKey="pending" stackId="1" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.6} name="Pending" />
              <Area type="monotone" dataKey="closed" stackId="1" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.6} name="Closed" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
