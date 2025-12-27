/**
 * Sovereign Intelligence Platform
 * Search Service - Full-text Search Across Reports
 */

import { prisma } from '../db/prisma';
import { cache, CACHE_PREFIX, TTL } from '../cache/redis';

/**
 * Search reports with full-text search
 */
export async function searchReports({
  query,
  organizationId,
  filters = {},
  page = 1,
  limit = 20,
}) {
  const skip = (page - 1) * limit;
  
  // Build search conditions
  const where = {
    organizationId,
    status: { not: 'ARCHIVED' },
  };
  
  // Apply filters
  if (filters.vertical) {
    where.vertical = filters.vertical;
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.createdById) {
    where.createdById = filters.createdById;
  }
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }
  
  // Full-text search using PostgreSQL
  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      // Search in JSON fields
      { inputData: { path: [], string_contains: query } },
    ];
  }
  
  const [results, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { updatedAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        description: true,
        vertical: true,
        status: true,
        language: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.report.count({ where }),
  ]);
  
  return {
    results,
    query,
    filters,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get search suggestions based on recent/popular searches
 */
export async function getSearchSuggestions(organizationId, partialQuery) {
  const cacheKey = `${CACHE_PREFIX.ORG}${organizationId}:suggestions:${partialQuery}`;
  
  return cache.getOrSet(cacheKey, async () => {
    // Get recent report titles that match
    const recentMatches = await prisma.report.findMany({
      where: {
        organizationId,
        title: { contains: partialQuery, mode: 'insensitive' },
        status: { not: 'ARCHIVED' },
      },
      select: { title: true },
      take: 5,
      orderBy: { updatedAt: 'desc' },
    });
    
    // Get popular verticals
    const verticals = await prisma.report.groupBy({
      by: ['vertical'],
      where: { organizationId },
      _count: true,
      orderBy: { _count: { vertical: 'desc' } },
      take: 5,
    });
    
    return {
      titles: recentMatches.map(r => r.title),
      verticals: verticals.map(v => v.vertical),
    };
  }, TTL.SHORT);
}

/**
 * Get recent searches for user
 */
export async function getRecentSearches(userId, limit = 10) {
  // This would typically be stored in a separate table
  // For now, we'll use cache
  const cacheKey = `user:${userId}:recent_searches`;
  const recent = await cache.get(cacheKey);
  return recent || [];
}

/**
 * Save search query to recent searches
 */
export async function saveRecentSearch(userId, query) {
  const cacheKey = `user:${userId}:recent_searches`;
  const recent = await cache.get(cacheKey) || [];
  
  // Add to front, remove duplicates, limit to 20
  const updated = [query, ...recent.filter(q => q !== query)].slice(0, 20);
  await cache.set(cacheKey, updated, TTL.LONG);
}

/**
 * Advanced search with facets
 */
export async function advancedSearch({
  query,
  organizationId,
  filters = {},
  facets = ['vertical', 'status', 'createdBy'],
  page = 1,
  limit = 20,
}) {
  // Get main results
  const searchResults = await searchReports({
    query,
    organizationId,
    filters,
    page,
    limit,
  });
  
  // Build facet counts
  const facetResults = {};
  
  for (const facet of facets) {
    if (facet === 'vertical') {
      facetResults.vertical = await prisma.report.groupBy({
        by: ['vertical'],
        where: { organizationId, status: { not: 'ARCHIVED' } },
        _count: true,
      });
    } else if (facet === 'status') {
      facetResults.status = await prisma.report.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      });
    } else if (facet === 'createdBy') {
      const creators = await prisma.report.groupBy({
        by: ['createdById'],
        where: { organizationId, status: { not: 'ARCHIVED' } },
        _count: true,
        take: 10,
      });
      
      // Get user names
      const userIds = creators.map(c => c.createdById);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });
      
      facetResults.createdBy = creators.map(c => ({
        userId: c.createdById,
        name: users.find(u => u.id === c.createdById)?.name || 'Unknown',
        count: c._count,
      }));
    }
  }
  
  return {
    ...searchResults,
    facets: facetResults,
  };
}

export default {
  searchReports,
  getSearchSuggestions,
  getRecentSearches,
  saveRecentSearch,
  advancedSearch,
};
