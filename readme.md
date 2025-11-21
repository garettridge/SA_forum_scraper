Known Bugs:

You have to babysit it while it's running a bit, because sometimes it will stop (at the point of a Tweet "timing out") and needs to get manually unstuck by hitting the back button on the tab getting scraped.  Then it continues fine.

Missing tweet images:
    Videos in embedded tweets might not show their preview images at all.

    Intermittent: Rarely, tweet images or preview cards don't load, possibly due to timing issues while checking for them.

Processing a thread in pieces (across multiple scraper runs) will break any post quote links that go to before the current run.

Intermittent: Pause/resume weirdness; not tested much.

Intermittent: The SA timg scraper sometimes replaces blocks like these with just an img:
<span class="timg_container"><img src="https://i.kym-cdn.com/photos/images/newsfeed/001/777/149/a8c.gif" alt="" class="timg complete" border="0"><div class="note" title="Click to toggle">600x337</div></span>

Limitations:

Minor formatting differences from SA.  Also no attempt to archive SA's niche features besides the posts themselves (user avatars, filter by user, etc).

Tweet embeds that have since been deleted from Twitter will check Internet Archive next, but most tweets aren't on there, so those will show as missing.

Tweets that are no longer anywhere but Internet Archive will show their text but not their images/media.  The urls just go back to the twitter CDN where they are no longer present, and you can't scrape/archive what no longer exists.   

If any SA post included a tweet reply, that will not show the parent for context.  Tweet embeds now hide their parent tweets when not logged in, so the scraper can't see it.  Tweets scraped from Internet Archive get around this by scraping the parent tweet instead and its top replies, which might not even include the posted one.

No attempt to sanitize HTML from SA posts. That would be unexpected anyway, but if the page becomes editable (new posts added) it should be addressed.

TODO:

Devise a horizontal slider UI widget that occupies the top of the page, in a frame showing the generated HTML pages below it.
The slider's frame should ideally be preserved across clickthroughs of the HTML pages.  Back button should still work.
Initially make the slider select a page number for the current thread.  Then, in a config file make a hash table mapping calendar dates
(retrieved from the first post timestamp of each HTML page) onto percentages (0% = earliest date in table, 100% = latest);
selecting a slider level selects that percentage and navigates to the correct date.  Hovering over the slider previews the date that would be chosen.
Finally, unify this hash table across all threads in the series, so the config file should break its dates into sections depending on the start/end date of each thread, and select the proper thread accordingly; these dates will not overlap.
 Or just programmatically unify all the threads and update page number references everywhere?
     This would hide thread OPs / transitions, and throw out the original page numbers.

Lower Priority:

Follow external non-twitter links and archive the complete .mhtml - too big?  Too hard?


In scraper, handle cases where clone.innerHTML needs sanitization, if/when testing ever encounters a live post containing HTML, possibly in a code block.

Unknown if non-preview URLs within tweet content can exist.

