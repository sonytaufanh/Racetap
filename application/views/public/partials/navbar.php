<body>

  <!-- NAVBAR -->
  <nav class="navbar navbar-expand-lg navbar-nexora fixed-top">
    <div class="container">
      <a class="navbar-brand navbar-brand-custom d-inline-flex align-items-center" href="<?= base_url()?>">
        <img src="<?= base_url('assets/images/logo-racetap.png')?>" alt="Logo Racetap" class="logo-racetap">
      </a>
      <button class="navbar-toggler navbar-toggler-custom" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="bar"></span><span class="bar"></span><span class="bar"></span>
      </button>
      <div class="collapse navbar-collapse" id="mainNav">
        <ul class="navbar-nav ms-auto align-items-lg-center gap-1 mt-3 mt-lg-0">
          <li class="nav-item"><a class="nav-link nav2 active"  href="<?= base_url()?>">Home</a></li>
          <li class="nav-item"><a class="nav-link nav2" href="<?= base_url('index.php/about')?>">About</a></li>
          <li class="nav-item"><a class="nav-link nav2" href="<?= base_url('index.php/services')?>">Services</a></li>
          <li class="nav-item"><a class="nav-link nav2" href="<?= base_url('index.php/results')?>">Results</a></li>
          <li class="nav-item"><a class="nav-link nav2" href="<?= base_url('index.php/photos')?>">Photos</a></li>
          <li class="nav-item ms-lg-2 mt-2 mt-lg-0">
            <a href="https://wa.me/6281249374648" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm-custom w-100">WhatsApp</a>
          </li>
        </ul>
      </div>
    </div>
  </nav>