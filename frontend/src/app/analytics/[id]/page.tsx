"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, BarChart3, Users, Clock, Percent, ShieldAlert, Sparkles, 
  Smartphone, Monitor, Tablet, RefreshCw, Globe, Calendar, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { api } from '@/lib/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function AnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id as string;

  const [form, setForm] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [rangeDays, setRangeDays] = useState<number>(7);
  
  const [isCompilingSentiment, setIsCompilingSentiment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('promptform_access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadData(rangeDays);
  }, [formId]);

  const loadData = async (days: number = rangeDays) => {
    setIsLoading(true);
    try {
      const [formDetails, analyticsData] = await Promise.all([
        api.get(`/forms/${formId}`),
        api.get(`/analytics/form/${formId}?range=${days}`)
      ]);
      setForm(formDetails);
      setAnalytics(analyticsData);
    } catch (err: any) {
      alert("Error loading analytics: " + err.message);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const days = parseInt(e.target.value);
    setRangeDays(days);
    loadData(days);
  };

  const handleCompileSentiment = async () => {
    setIsCompilingSentiment(true);
    try {
      const res = await api.post('/ai/analyze-sentiment', { formId });
      setAnalytics({ ...analytics, sentimentSummary: res.sentimentSummary });
      alert("Sentiment report successfully generated!");
    } catch (err: any) {
      alert("Failed to analyze sentiment: " + err.message);
    } finally {
      setIsCompilingSentiment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    );
  }

  // Calculate stats
  const views = analytics?.totalViews || 0;
  const submissions = analytics?.totalSubmissions || 0;
  const completionRate = analytics?.completionRate || 0;
  const avgTimeTaken = analytics?.averageSubmissionTime || 0;

  // Device calculations
  const devices = analytics?.deviceStats || { desktop: 0, mobile: 0, tablet: 0 };
  const devicePieData = [
    { name: 'Desktop', value: devices.desktop || 0, color: '#7C6AFA' },
    { name: 'Mobile', value: devices.mobile || 0, color: '#30A46C' },
    { name: 'Tablet', value: devices.tablet || 0, color: '#E5A519' },
  ].filter(d => d.value > 0);

  // Country calculations
  const countries = Object.entries(analytics?.countryStats || {})
    .map(([country, count]) => ({ country, count: count as number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const totalGeoViews = Object.values(analytics?.countryStats || {}).reduce((sum: number, c: any) => sum + c, 0) as number || 1;

  // Sentiment distributions
  const sentiment = analytics?.sentimentSummary || null;

  return (
    <div className="min-h-screen bg-background dark:bg-background text-foreground dark:text-foreground p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER PANEL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" className="p-2" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{form.title}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time Insights Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2 bg-card border border-border rounded-lg px-3 py-1.5 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <select 
                value={rangeDays} 
                onChange={handleRangeChange}
                className="bg-transparent border-none focus:ring-0 outline-none pr-6 cursor-pointer font-medium"
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={90}>Last 90 Days</option>
              </select>
            </div>

            <Button variant="outline" size="sm" onClick={() => loadData(rangeDays)} className="space-x-1">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* STATS HIGHLIGHT GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider">Views</span>
                <Users className="w-5 h-5 text-primary" />
              </div>
              <p className="text-3xl font-bold mt-2">{views}</p>
              <p className="text-xs text-muted-foreground mt-1">Total page visitors</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider">Submissions</span>
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <p className="text-3xl font-bold mt-2">{submissions}</p>
              <p className="text-xs text-muted-foreground mt-1">Locked responses sheets</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider">Completion Rate</span>
                <Percent className="w-5 h-5 text-primary" />
              </div>
              <p className="text-3xl font-bold mt-2">{completionRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Submissions per view</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center text-muted-foreground">
                <span className="text-xs font-bold uppercase tracking-wider">Avg Time Taken</span>
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <p className="text-3xl font-bold mt-2">{avgTimeTaken}s</p>
              <p className="text-xs text-muted-foreground mt-1">Seconds per submission</p>
            </CardContent>
          </Card>
        </div>

        {/* TIME SERIES HISTORICAL TREND CHART */}
        <Card>
          <CardHeader>
            <CardTitle>Historical Performance Trends</CardTitle>
            <CardDescription>Visual timeline of daily views and form submissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              {mounted && analytics?.trends && analytics.trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.trends}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C6AFA" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#7C6AFA" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#30A46C" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#30A46C" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226,232,240,0.3)" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)' }} />
                    <Legend verticalAlign="top" height={36} />
                    <Area type="monotone" dataKey="views" stroke="#7C6AFA" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" name="Views" />
                    <Area type="monotone" dataKey="submissions" stroke="#30A46C" strokeWidth={2} fillOpacity={1} fill="url(#colorSubmissions)" name="Submissions" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs">
                  No historical trend data recorded for this time range.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* DEVICE, GEOGRAPHY & SENTIMENT SPLIT */}
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* DEVICE DISTRIBUTION */}
          <Card>
            <CardHeader>
              <CardTitle>Device Distribution</CardTitle>
              <CardDescription>Responders device breakdown.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-6 min-h-[250px]">
              {mounted && devicePieData.length > 0 ? (
                <div className="w-full flex items-center justify-around">
                  <div className="h-32 w-32 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={devicePieData}
                          innerRadius={36}
                          outerRadius={56}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {devicePieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col space-y-3 text-xs">
                    {devicePieData.map((d, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="font-semibold">{d.name}:</span>
                        <span className="text-muted-foreground">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-xs text-muted-foreground">
                  No device data available.
                </div>
              )}
            </CardContent>
          </Card>

          {/* GEOGRAPHY DISTRIBUTION */}
          <Card>
            <CardHeader>
              <CardTitle>Top Traffic Locations</CardTitle>
              <CardDescription>Geographic analysis of views.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 min-h-[250px] flex flex-col justify-center">
              {countries.length > 0 ? (
                countries.map((c, index) => {
                  const pct = Math.round((c.count / totalGeoViews) * 100);
                  return (
                    <div key={index} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold flex items-center space-x-1.5">
                          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{c.country}</span>
                        </span>
                        <span className="font-bold text-muted-foreground">{pct}% ({c.count})</span>
                      </div>
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-xs text-muted-foreground">
                  No location data recorded yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* SENTIMENT ANALYSIS */}
          <Card className="flex flex-col justify-between">
            <div>
              <CardHeader>
                <div className="flex items-center space-x-2 text-primary dark:text-primary">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <CardTitle>AI Sentiment Summary</CardTitle>
                </div>
                <CardDescription>NLP summary score of textual answer fields.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!sentiment ? (
                  <div className="text-center py-6 text-muted-foreground space-y-3">
                    <p className="text-xs leading-relaxed">No sentiment analysis report generated for responses.</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleCompileSentiment} 
                      disabled={isCompilingSentiment || submissions === 0}
                      className="space-x-1.5"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Compile Report</span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="relative w-16 h-16 rounded-full border-4 border-primary/20 flex items-center justify-center font-bold text-base text-primary">
                        {sentiment.average_score}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">Average Sentiment Score</p>
                        <p className="text-sm font-bold text-foreground dark:text-foreground mt-0.5">
                          {sentiment.average_score >= 0.7 ? "Highly Positive 🎉" :
                           sentiment.average_score >= 0.4 ? "Neutral Balance ⚖️" :
                           "Negative skew ⚠️"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-600 font-semibold flex items-center space-x-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                          <span>Positive Responses</span>
                        </span>
                        <span className="font-bold">{sentiment.sentiment_distribution?.positive || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-semibold flex items-center space-x-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground inline-block"></span>
                          <span>Neutral Responses</span>
                        </span>
                        <span className="font-bold">{sentiment.sentiment_distribution?.neutral || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-destructive font-semibold flex items-center space-x-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-destructive inline-block"></span>
                          <span>Negative Responses</span>
                        </span>
                        <span className="font-bold">{sentiment.sentiment_distribution?.negative || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </div>

            {sentiment && (
              <div className="p-5 border-t border-border dark:border-border">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs" 
                  onClick={handleCompileSentiment} 
                  disabled={isCompilingSentiment}
                >
                  Recompile Report
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* DROPOUT FUNNEL BLOCK */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel & Dropout Rates</CardTitle>
            <CardDescription>Percentage of users remaining at each step.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {analytics?.funnel && analytics.funnel.length > 0 ? (
              <div className="space-y-4">
                {analytics.funnel.map((step: any, index: number) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold flex items-center space-x-2">
                        <span className="bg-primary/10 text-primary w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]">
                          {index + 1}
                        </span>
                        <span>{step.stepName}</span>
                      </span>
                      <span className="font-bold text-muted-foreground">{step.percentage}% ({step.count} users)</span>
                    </div>
                    <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full rounded-full transition-all duration-500" 
                        style={{ width: `${step.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No drop-out events recorded. Dropouts will be logged when users start typing but do not submit.
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
