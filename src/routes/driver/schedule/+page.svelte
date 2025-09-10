<!-- src/routes/driver/schedule/+page.svelte -->
<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "$lib/components/ui/card";
  import { Calendar, Clock, MapPin, Car, User, Phone, Plus, Edit } from "@lucide/svelte";

  // Mock schedule data
  let schedule = $state([
    {
      id: 1,
      date: "2024-01-15",
      day: "Monday",
      shifts: [
        {
          id: 1,
          startTime: "08:00",
          endTime: "12:00",
          type: "Morning Shift",
          status: "active",
          rides: 3
        },
        {
          id: 2,
          startTime: "14:00",
          endTime: "18:00",
          type: "Afternoon Shift",
          status: "scheduled",
          rides: 2
        }
      ]
    },
    {
      id: 2,
      date: "2024-01-16",
      day: "Tuesday",
      shifts: [
        {
          id: 3,
          startTime: "09:00",
          endTime: "17:00",
          type: "Full Day",
          status: "scheduled",
          rides: 5
        }
      ]
    },
    {
      id: 3,
      date: "2024-01-17",
      day: "Wednesday",
      shifts: [
        {
          id: 4,
          startTime: "10:00",
          endTime: "14:00",
          type: "Part Time",
          status: "scheduled",
          rides: 2
        }
      ]
    }
  ]);

  let selectedDate = $state("2024-01-15");

  function getStatusColor(status: string) {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  let selectedDaySchedule = $derived(() => {
    return schedule.find(day => day.date === selectedDate);
  });
</script>

<svelte:head>
  <title>My Schedule - DriveKind</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">My Schedule</h1>
      <p class="text-muted-foreground">View and manage your work schedule</p>
    </div>
    <Button>
      <Plus class="w-4 h-4 mr-2" />
      Request Time Off
    </Button>
  </div>

  <!-- Schedule Overview -->
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {#each schedule as day}
      <Card class={selectedDate === day.date ? "ring-2 ring-primary" : ""}>
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between">
            <div>
              <CardTitle class="text-lg">{day.day}</CardTitle>
              <CardDescription>{formatDate(day.date)}</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onclick={() => selectedDate = day.date}
            >
              View
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div class="space-y-2">
            {#each day.shifts as shift}
              <div class="flex items-center justify-between p-2 rounded-lg bg-muted">
                <div>
                  <p class="text-sm font-medium">{shift.type}</p>
                  <p class="text-xs text-muted-foreground">
                    {shift.startTime} - {shift.endTime}
                  </p>
                </div>
                <div class="text-right">
                  <Badge class={getStatusColor(shift.status)}>
                    {shift.status}
                  </Badge>
                  <p class="text-xs text-muted-foreground mt-1">
                    {shift.rides} rides
                  </p>
                </div>
              </div>
            {/each}
          </div>
        </CardContent>
      </Card>
    {/each}
  </div>

  <!-- Detailed Schedule for Selected Day -->
  {#if selectedDaySchedule()}
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2">
          <Calendar class="w-5 h-5" />
          {selectedDaySchedule().day} - {formatDate(selectedDaySchedule().date)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-4">
          {#each selectedDaySchedule().shifts as shift}
            <div class="border rounded-lg p-4">
              <div class="flex items-center justify-between mb-3">
                <div>
                  <h3 class="font-semibold">{shift.type}</h3>
                  <p class="text-sm text-muted-foreground">
                    {shift.startTime} - {shift.endTime}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <Badge class={getStatusColor(shift.status)}>
                    {shift.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Edit class="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
              
              <!-- Mock ride details for this shift -->
              <div class="space-y-2">
                <h4 class="text-sm font-medium text-muted-foreground">Scheduled Rides ({shift.rides})</h4>
                <div class="grid gap-2">
                  {#each Array(shift.rides) as _, i}
                    <div class="flex items-center justify-between p-2 bg-muted rounded">
                      <div class="flex items-center gap-3">
                        <div class="w-2 h-2 bg-primary rounded-full"></div>
                        <div>
                          <p class="text-sm font-medium">Ride #{i + 1}</p>
                          <p class="text-xs text-muted-foreground">
                            {String(parseInt(shift.startTime) + i * 2).padStart(2, '0')}:00 - 
                            {String(parseInt(shift.startTime) + i * 2 + 1).padStart(2, '0')}:00
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">View</Button>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>
  {/if}

  <!-- Quick Actions -->
  <Card>
    <CardHeader>
      <CardTitle>Quick Actions</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="flex gap-2">
        <Button variant="outline">
          <Clock class="w-4 h-4 mr-2" />
          Clock In/Out
        </Button>
        <Button variant="outline">
          <Plus class="w-4 h-4 mr-2" />
          Add Availability
        </Button>
        <Button variant="outline">
          <Edit class="w-4 h-4 mr-2" />
          Edit Schedule
        </Button>
      </div>
    </CardContent>
  </Card>
</div>
