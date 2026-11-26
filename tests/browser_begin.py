"""Begin a new campaign from the setup form in a browser check.

The web server and the downloadable edition both keep a rolling autosave. When one
already exists, starting another hero from the title page asks first; the checks
replace it, as a player starting over would.
"""


def begin(page, name):
    page.locator('#startCampaignBtn').click()
    # A function, not a string condition: the single-file build's security policy blocks eval.
    page.wait_for_function("(name)=>(typeof state==='object'&&Boolean(state)&&state.player.name===name&&!busy)||Boolean(document.querySelector('#sessionDecision button[value=replace]'))", arg=name)
    replace = page.locator('#sessionDecision button[value=replace]')
    if replace.count():
        replace.click()
    page.wait_for_function("(name)=>typeof state==='object'&&Boolean(state)&&state.player.name===name&&!busy", arg=name)
