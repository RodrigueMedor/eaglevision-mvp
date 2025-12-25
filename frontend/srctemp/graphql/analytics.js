import { gql } from '@apollo/client';

export const GET_ANALYTICS = gql`
  query GetAnalytics($startDate: String!, $endDate: String!) {
    appointmentStats: getAppointmentStats(startDate: $startDate, endDate: $endDate) {
      totalAppointments
      byStatus {
        status
        count
        revenue
      }
    }
    revenueStats: getRevenueStats(startDate: $startDate, endDate: $endDate) {
      totalRevenue
      byService {
        service
        revenue
        count
      }
      monthlyRevenue {
        month
        revenue
        count
      }
    }
    userStats: getUserActivityStats(startDate: $startDate, endDate: $endDate) {
      activeUsers
      activity {
        date
        logins
        appointments
      }
    }
  }
`;
