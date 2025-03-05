import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

const settingsFormSchema = z.object({
  normalStartTime: z.string(),
  normalEndTime: z.string(),
  overtimeStartTime: z.string(),
  overtimeEndTime: z.string(),
  normalRate: z.string(),
  overtimeRate: z.string(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/settings");
        return res.json();
      } catch (error) {
        // Return default settings if none exist
        return {
          normalStartTime: "09:00",
          normalEndTime: "17:00",
          overtimeStartTime: "17:00",
          overtimeEndTime: "22:00",
          normalRate: "20.00",
          overtimeRate: "35.00",
        };
      }
    },
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: settings || {
      normalStartTime: "09:00",
      normalEndTime: "17:00",
      overtimeStartTime: "17:00",
      overtimeEndTime: "22:00",
      normalRate: "20.00",
      overtimeRate: "35.00",
    },
  });

  // Update form values when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  // Save settings mutation
  const saveSettings = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      const res = await apiRequest("POST", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      // Also invalidate timesheets to refresh calculations
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      toast({
        title: "Settings saved",
        description: "Your work hour settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SettingsFormValues) => {
    saveSettings.mutate(data);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div>Loading settings...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Card className="mb-8 bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent border-none">
        <CardHeader>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Configure your working hours and rates
          </p>
        </CardHeader>
      </Card>

      <div className="max-w-2xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Normal Working Hours</h2>
                <p className="text-sm text-muted-foreground">
                  Set your standard working hours and rate
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="normalStartTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="normalEndTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="normalRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate (£)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormDescription>
                        Standard hourly rate for normal working hours
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Overtime Hours</h2>
                <p className="text-sm text-muted-foreground">
                  Configure overtime period and rate
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="overtimeStartTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="overtimeEndTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="overtimeRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overtime Rate (£)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormDescription>
                        Hourly rate applied during overtime hours
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={saveSettings.isPending}>
                {saveSettings.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}