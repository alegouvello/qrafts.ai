import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";

interface Application {
  appliedDate: string;
}

interface WeeklyChartProps {
  applications: Application[];
}

export const WeeklyChart = ({ applications }: WeeklyChartProps) => {
  // Generate data for the past 7 days
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const count = applications.filter(app => app.appliedDate === dateStr).length;
    
    return {
      date: format(date, 'EEE'), // Mon, Tue, Wed, etc.
      fullDate: format(date, 'MMM d'), // Jan 1, Jan 2, etc.
      applications: count,
    };
  });

  const totalWeek = chartData.reduce((sum, day) => sum + day.applications, 0);
  const avgPerDay = (totalWeek / 7).toFixed(1);

  return (
    <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur-sm border-border/40">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Weekly Activity</h3>
          <p className="text-sm text-muted-foreground">
            {totalWeek} applications • {avgPerDay} per day avg
          </p>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--foreground))"
            }}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]) {
                return payload[0].payload.fullDate;
              }
              return label;
            }}
            formatter={(value: number) => [value, "Applications"]}
          />
          <Bar 
            dataKey="applications" 
            fill="hsl(var(--primary))" 
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
